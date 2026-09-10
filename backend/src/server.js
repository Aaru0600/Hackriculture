import { env } from './config/env.js'
import { connectDb } from './config/db.js'
import { createApp } from './app.js'
import { seedDemoAdmin } from './seed.js'

async function main() {
  await connectDb()
  console.log(`[db] connected: ${env.MONGO_URI.replace(/\/\/.*@/, '//')}`)
  await seedDemoAdmin()

  const app = createApp()
  app.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}/api  (${env.NODE_ENV})`)
    console.log(`[api] ML service: ${env.ML_SERVICE_URL}`)
  })
}

main().catch((err) => {
  console.error('[fatal] failed to start:', err)
  process.exit(1)
})
