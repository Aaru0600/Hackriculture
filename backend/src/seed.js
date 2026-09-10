import { env } from './config/env.js'
import { User } from './models/User.js'

/** Create the demo admin once, so the frontend's dev login hint works. */
export async function seedDemoAdmin() {
  if (!env.SEED_DEMO_ADMIN) return
  const existing = await User.findOne({ email: env.DEMO_ADMIN_EMAIL })
  if (existing) return

  const admin = new User({
    name: 'Platform Admin',
    email: env.DEMO_ADMIN_EMAIL,
    role: 'admin',
    state: 'Delhi',
    district: 'New Delhi',
    preferredLanguage: 'en',
  })
  await admin.setPassword(env.DEMO_ADMIN_PASSWORD)
  await admin.save()
  if (!env.isTest) console.log(`[seed] demo admin created: ${env.DEMO_ADMIN_EMAIL}`)
}
