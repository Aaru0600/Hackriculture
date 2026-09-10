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
    '/model-info': () => ({
      models: {
        yield: {
          name: 'Crop Yield (HGB regressor)', version: '2.0-real', algorithm: 'HistGradientBoostingRegressor',
          metrics: { r2: 0.96, mae_t_ha: 1.2, mape: 0.18 }, trained_at: '2026-09-10',
        },
        crop: {
          name: 'Crop Recommendation (RF)', version: 'crop-1.0', algorithm: 'RandomForestClassifier',
          metrics: { accuracy: 0.99, macro_f1: 0.99 }, trained_at: '2026-09-10',
        },
        irrigation: {
          name: 'Irrigation Need (RF)', version: 'irrigation-1.0', algorithm: 'RandomForestClassifier',
          metrics: { macro_f1: 0.97 }, trained_at: '2026-09-10',
        },
      },
    }),
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
      if (req.url === '/health') {
        res.end(JSON.stringify({ status: 'ok', models: { yield: true } }))
        return
      }
      const body = raw ? JSON.parse(raw) : {}
      const route = mlStub.routes[req.url]
      const payload = route ? route(body) : mlStub.handler(body)
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
