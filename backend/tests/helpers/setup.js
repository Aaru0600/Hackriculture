/**
 * Shared test rig: in-memory MongoDB + a stub ML service.
 * Import and call `startTestEnv()` in a test's `before()`, `stopTestEnv()` in `after()`.
 * Env vars are set by `tests/setup-env.js` (preloaded via `node --test --import`).
 */
import http from 'node:http'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { env } from '../../src/config/env.js'
import { connectDb, disconnectDb } from '../../src/config/db.js'

let mongo
let mlServer

/** Canned ML responses by path; override `mlStub.handler` in a test to change behaviour. */
export const mlStub = {
  routes: {
    '/recommend/crops': (_body) => ({
      recommendations: [
        { crop: 'rice', suitabilityScore: 96.4, expectedYield: { low: 3, high: 6, unit: 't/ha' },
          waterRequirement: 'High', durationDays: { low: 110, high: 150 },
          expectedProfit: null, profitNote: 'Not estimated.', whyRecommended: 'matches rainfall & humidity', matchedConditions: ['rainfall', 'humidity'] },
        { crop: 'jute', suitabilityScore: 2.1, expectedYield: { low: 2, high: 3.5, unit: 't/ha' },
          waterRequirement: 'High', durationDays: { low: 100, high: 130 },
          expectedProfit: null, profitNote: 'Not estimated.', whyRecommended: 'humid', matchedConditions: ['humidity'] },
      ],
      alternatives: [{ crop: 'coconut', suitabilityScore: 0.8 }],
      model_version: 'crop-1.0-test', model_source: 'random_forest_classifier',
      disclaimer: 'confirm with a local officer',
    }),
    // Flat model card per ?task= (mirrors the real ml-service /model-info shape).
    '/model-info': (_body, query = {}) => {
      const task = query.task || 'yield'
      const base = {
        created_at: '2026-09-10T00:00:00Z',
        versions: { python: '3.13.9', scikit_learn: '1.9.0' },
      }
      if (task === 'crop') {
        return { ...base, task: 'crop_recommendation', model_type: 'RandomForestClassifier (7 agronomic inputs)',
          dataset: { rows: 2200, sha256: '734f06ae488803b1c7996c2be22651', synthetic: false },
          metrics: { accuracy: 0.9932, macro_f1: 0.9932, top3_accuracy: 1.0 } }
      }
      if (task === 'irrigation') {
        return { ...base, task: 'irrigation_need', model_type: 'RandomForestClassifier (class_weight=balanced)',
          dataset: { rows: 10000, sha256: '9aa80c2a3a412f1a519ffe31201cef', synthetic: false },
          metrics: { macro_f1_holdout: 0.9691 } }
      }
      return { ...base, model_type: 'HistGradientBoostingRegressor (squared error), sklearn Pipeline',
        target: 'yield_t_ha',
        dataset: { rows: 5153, sha256: 'c279803a0120b317e5bbc68f8995c5', synthetic: false },
        metrics: { gbm_holdout: { mae: 1.2028, r2: 0.9569, mape_pct: 17.71 } } }
    },
    '/recommend/irrigation': (_body) => ({
      irrigationNeed: 'Medium', needConfidence: 71, priority: 'Medium',
      waterRequirement: { netDepthMm: 45, grossDepthMm: 60, litresPerHectare: 600000, totalVolumeM3: 180, text: '~60 mm (sprinkler)' },
      nextIrrigation: 'In about 4 days', duration: '~2.1 hours for 3 ha',
      rainfallAdjustment: 'No forecast rainfall adjustment applied.',
      reason: 'Because soil moisture is low.', assumptions: ['ref depth 45 mm'],
      model_version: 'irrigation-1.0-test', model_source: 'random_forest_classifier',
      disclaimer: 'check field moisture',
    }),
  },
  handler: (_body) => ({
    predicted_yield_t_ha: 3.42,
    core_yield_t_ha: 3.5,
    adjustment_factor: 0.977,
    adjustment_inputs_used: ['ph', 'npk'],
    adjustment_detail: [
      { input: 'ph', label: 'Soil pH', multiplier: 0.99, direction: 'about neutral' },
    ],
    yield_range_t_ha: [2.6, 4.24],
    expected_production_t: 10.26,
    prediction_quality: 78,
    prediction_quality_note: 'model score, not a probability',
    risk_level: 'low',
    influencing_factors: [
      { feature: 'ph', label: 'Soil pH', source: 'agronomic input', impact_t_ha: -0.03, direction: 'lowers yield' },
    ],
    response_curves: { rainfall: [{ x: 400, yield_t_ha: 3.1 }], temperature: [{ x: 18, yield_t_ha: 3.4 }] },
    reference_yield_t_ha: 1.68,
    model_version: 'test-1',
    model_source: 'gbm',
    generated_at: new Date().toISOString(),
  }),
  status: 200,
}

async function startMlStub() {
  mlServer = http.createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json')
      const path = req.url.split('?')[0]
      if (path === '/health') {
        res.end(JSON.stringify({ status: 'ok', models: { yield: true } }))
        return
      }
      const body = raw ? JSON.parse(raw) : {}
      const query = Object.fromEntries(new URLSearchParams(req.url.split('?')[1] || ''))
      const route = mlStub.routes[path]
      const payload = route ? route(body, query) : mlStub.handler(body)
      res.statusCode = mlStub.status
      res.end(JSON.stringify(payload))
    })
  })
  await new Promise((r) => mlServer.listen(0, '127.0.0.1', r))
  env.ML_SERVICE_URL = `http://127.0.0.1:${mlServer.address().port}`
}

export async function startTestEnv() {
  mongo = await MongoMemoryServer.create()
  env.MONGO_URI = mongo.getUri()
  await connectDb(env.MONGO_URI)
  await startMlStub()
}

export async function stopTestEnv() {
  await disconnectDb()
  await mongo?.stop()
  await new Promise((r) => mlServer?.close(r))
}

export async function resetDb() {
  const { collections } = mongoose.connection
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})))
}
