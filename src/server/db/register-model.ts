import mongoose, { type Schema } from 'mongoose'

export function registerModel(name: string, schema: Schema): mongoose.Model<mongoose.AnyObject> {
  const existing = mongoose.models[name]
  if (existing) return existing as unknown as mongoose.Model<mongoose.AnyObject>
  return mongoose.model(name, schema) as unknown as mongoose.Model<mongoose.AnyObject>
}
