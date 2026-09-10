/**
 * Hand-authored OpenAPI 3.0 description of the HACKRICULTURE backend. Served as
 * JSON at `GET /api/docs.json` and rendered by Swagger UI at `GET /api/docs`.
 * Kept deliberately concise - it documents paths, auth and the envelope, not
 * every field (the Zod validators are the source of truth for request bodies).
 */
const bearer = [{ bearerAuth: [] }]

const envelope = (dataSchema) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    data: dataSchema ?? {},
  },
})

const listData = {
  type: 'object',
  properties: {
    items: { type: 'array', items: { type: 'object' } },
    page: { type: 'integer' },
    limit: { type: 'integer' },
    total: { type: 'integer' },
    pages: { type: 'integer' },
  },
}

const jsonBody = (example) => ({
  required: true,
  content: { 'application/json': { schema: { type: 'object' }, ...(example ? { example } : {}) } },
})

const okResponse = (desc = 'Success') => ({
  description: desc,
  content: { 'application/json': { schema: envelope() } },
})

const p = (summary, opts = {}) => ({
  summary,
  tags: opts.tags,
  security: opts.auth ? bearer : undefined,
  parameters: opts.parameters,
  requestBody: opts.body,
  responses: {
    200: okResponse(opts.okDesc),
    ...(opts.created ? { 201: okResponse('Created') } : {}),
    ...(opts.auth ? { 401: { description: 'Missing or invalid token' } } : {}),
    ...(opts.admin ? { 403: { description: 'Admin only' } } : {}),
    ...(opts.notFound ? { 404: { description: 'Not found' } } : {}),
    ...(opts.validated ? { 400: { description: 'Validation failed' } } : {}),
  },
})

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'HACKRICULTURE API',
    version: '1.0.0',
    description:
      'Node/Express backend for the AI-Powered Smart Farming & Crop Intelligence Platform. '
      + 'All responses use the envelope `{ success, message, data }`. Authenticated routes '
      + 'take `Authorization: Bearer <JWT>` from `/auth/login` or `/auth/register`.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: { Envelope: envelope(), ListData: listData },
  },
  tags: [
    { name: 'System' }, { name: 'Auth' }, { name: 'Farms' }, { name: 'Predictions' },
    { name: 'Recommendations' }, { name: 'Alerts' }, { name: 'Dashboard' },
    { name: 'Assistant' }, { name: 'Data' }, { name: 'Admin' },
  ],
  paths: {
    '/health': { get: p('Service + ML health', { tags: ['System'] }) },
    '/docs.json': { get: p('This OpenAPI document', { tags: ['System'] }) },

    '/auth/register': {
      post: p('Create a farmer account', {
        tags: ['Auth'], created: true, validated: true,
        body: jsonBody({ name: 'Asha Rao', email: 'asha@example.com', password: 'greenfield9', state: 'karnataka' }),
      }),
    },
    '/auth/login': {
      post: p('Sign in with email or phone', {
        tags: ['Auth'], validated: true,
        body: jsonBody({ identifier: 'asha@example.com', password: 'greenfield9' }),
      }),
    },
    '/auth/logout': { post: p('Discard the session (client-side)', { tags: ['Auth'] }) },
    '/auth/me': { get: p('Current user', { tags: ['Auth'], auth: true }) },
    '/auth/profile': {
      put: p('Update profile fields', { tags: ['Auth'], auth: true, validated: true, body: jsonBody() }),
    },
    '/auth/password': {
      put: p('Change password', {
        tags: ['Auth'], auth: true, validated: true,
        body: jsonBody({ currentPassword: 'greenfield9', newPassword: 'greener-field-10' }),
      }),
    },
    '/auth/forgot-password': {
      post: p('Request a reset link (always 200)', { tags: ['Auth'], validated: true, body: jsonBody() }),
    },

    '/farms': {
      get: p('List the caller’s farms', { tags: ['Farms'], auth: true }),
      post: p('Create a farm', { tags: ['Farms'], auth: true, created: true, validated: true, body: jsonBody({ farmName: 'North Field', area: 3.5, areaUnit: 'acre', soilType: 'loamy', currentCrop: 'wheat', growthStage: 'vegetative' }) }),
    },
    '/farms/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: p('Get one farm', { tags: ['Farms'], auth: true, notFound: true }),
      put: p('Partial update (>=1 field)', { tags: ['Farms'], auth: true, validated: true, notFound: true, body: jsonBody({ growthStage: 'flowering' }) }),
      delete: p('Delete a farm', { tags: ['Farms'], auth: true, notFound: true }),
    },

    '/predictions/yield': {
      post: p('Run a crop-yield prediction', {
        tags: ['Predictions'], auth: true, created: true, validated: true,
        body: jsonBody({ crop: 'wheat', state: 'punjab', season: 'rabi', farmSize: 3, soilPH: 6.6 }),
        okDesc: 'Prediction (502/503 if the ML service is down)',
      }),
    },
    '/predictions/history': {
      get: p('Your prediction history', { tags: ['Predictions'], auth: true, parameters: [
        { name: 'type', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
      ] }),
    },
    '/predictions/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: p('Get one prediction', { tags: ['Predictions'], auth: true, notFound: true }),
    },

    '/recommendations/crop': {
      post: p('Crop recommendation (RandomForest)', { tags: ['Recommendations'], auth: true, created: true, validated: true, body: jsonBody({ nitrogen: 90, phosphorus: 42, potassium: 43, temperature: 21, humidity: 82, soilPH: 6.5, rainfall: 200 }) }),
    },
    '/recommendations/irrigation': {
      post: p('Smart irrigation plan', { tags: ['Recommendations'], auth: true, created: true, validated: true, body: jsonBody({ crop: 'wheat', soilMoisture: 18, growthStage: 'vegetative' }) }),
    },
    '/recommendations/fertilizer': {
      post: p('Rule-based fertiliser plan (no ML)', { tags: ['Recommendations'], auth: true, created: true, validated: true, body: jsonBody({ crop: 'wheat', nitrogen: 40, phosphorus: 20, potassium: 15, soilPH: 5.2 }) }),
    },
    '/recommendations/history': {
      get: p('Your recommendation history', { tags: ['Recommendations'], auth: true, parameters: [
        { name: 'kind', in: 'query', schema: { type: 'string', enum: ['crop', 'fertilizer', 'irrigation'] } },
      ] }),
    },
    '/recommendations/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: p('Get one recommendation', { tags: ['Recommendations'], auth: true, notFound: true }),
    },

    '/alerts': {
      get: p('Farming alerts (regenerated from the forecast)', { tags: ['Alerts'], auth: true, parameters: [
        { name: 'unread', in: 'query', schema: { type: 'boolean' } },
        { name: 'farm', in: 'query', schema: { type: 'string' } },
      ] }),
    },
    '/alerts/read-all': { put: p('Mark every alert read', { tags: ['Alerts'], auth: true }) },
    '/alerts/{id}/read': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      put: p('Mark one alert read/unread', { tags: ['Alerts'], auth: true, notFound: true, body: jsonBody({ read: true }) }),
    },

    '/dashboard': { get: p('Farmer home aggregate', { tags: ['Dashboard'], auth: true }) },

    '/assistant/chat': {
      post: p('KrishiAI chat (LLM proxy or rule-based fallback)', { tags: ['Assistant'], auth: true, validated: true, body: jsonBody({ messages: [{ role: 'user', content: 'What fertiliser for wheat?' }] }) }),
    },

    '/weather/bundle': {
      get: p('Current + 7-day forecast (Open-Meteo proxy)', { tags: ['Data'], validated: true, parameters: [
        { name: 'lat', in: 'query', required: true, schema: { type: 'number' } },
        { name: 'lon', in: 'query', required: true, schema: { type: 'number' } },
      ] }),
    },
    '/geo/search': {
      get: p('Place search (Open-Meteo geocoding proxy)', { tags: ['Data'], validated: true, parameters: [
        { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
      ] }),
    },
    '/geo/reverse': {
      get: p('Coordinates -> place name', { tags: ['Data'], validated: true, parameters: [
        { name: 'lat', in: 'query', required: true, schema: { type: 'number' } },
        { name: 'lon', in: 'query', required: true, schema: { type: 'number' } },
      ] }),
    },
    '/soil/estimate': {
      get: p('Soil pH / texture estimate (SoilGrids proxy)', { tags: ['Data'], validated: true, parameters: [
        { name: 'lat', in: 'query', required: true, schema: { type: 'number' } },
        { name: 'lon', in: 'query', required: true, schema: { type: 'number' } },
      ] }),
    },

    '/admin/stats': { get: p('Platform statistics', { tags: ['Admin'], auth: true, admin: true }) },
    '/admin/users': {
      get: p('List users (paged, searchable)', { tags: ['Admin'], auth: true, admin: true }),
    },
    '/admin/users/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      patch: p('Change a user’s role', { tags: ['Admin'], auth: true, admin: true, validated: true, notFound: true, body: jsonBody({ role: 'admin' }) }),
      delete: p('Delete a user and their records', { tags: ['Admin'], auth: true, admin: true, notFound: true }),
    },
    '/admin/predictions': { get: p('All predictions (paged)', { tags: ['Admin'], auth: true, admin: true }) },
    '/admin/recommendations': { get: p('All recommendations (paged)', { tags: ['Admin'], auth: true, admin: true }) },
    '/admin/models': { get: p('ML model status (live /model-info + admin notes)', { tags: ['Admin'], auth: true, admin: true }) },
    '/admin/models/{key}': {
      parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string', enum: ['yield', 'crop', 'irrigation', 'fertilizer'] } }],
      patch: p('Set model status / notes', { tags: ['Admin'], auth: true, admin: true, validated: true, body: jsonBody({ status: 'production', notes: 'Retrained 2026-09' }) }),
    },
    '/admin/datasets': {
      get: p('Dataset registry', { tags: ['Admin'], auth: true, admin: true }),
      post: p('Register a dataset', { tags: ['Admin'], auth: true, admin: true, created: true, validated: true, body: jsonBody({ name: 'Crop Yield in Indian States', task: 'yield', rows: 5150, synthetic: false }) }),
    },
    '/admin/datasets/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      patch: p('Update a registry entry', { tags: ['Admin'], auth: true, admin: true, validated: true, notFound: true, body: jsonBody({ status: 'archived' }) }),
      delete: p('Remove a registry entry', { tags: ['Admin'], auth: true, admin: true, notFound: true }),
    },
  },
}
