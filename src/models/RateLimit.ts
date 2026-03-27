import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRateLimitDocument extends Document {
  ip: string;
  attempts: number;
  lockedUntil: Date | null;
  updatedAt: Date;
}

const RateLimitSchema = new Schema<IRateLimitDocument>(
  {
    ip: { type: String, required: true, unique: true },
    attempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-delete documents 10 minutes after last update
RateLimitSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 600 });

const RateLimit: Model<IRateLimitDocument> =
  mongoose.models.RateLimit ||
  mongoose.model<IRateLimitDocument>("RateLimit", RateLimitSchema);

export default RateLimit;
