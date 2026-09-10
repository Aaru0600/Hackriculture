import mongoose from 'mongoose'
import { env } from './env.js'

mongoose.set('strictQuery', true)

export async function connectDb(uri = env.MONGO_URI) {
  if (!uri) throw new Error('connectDb: no MongoDB URI provided')
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  return mongoose.connection
}

export async function disconnectDb() {
  await mongoose.connection.close()
}
