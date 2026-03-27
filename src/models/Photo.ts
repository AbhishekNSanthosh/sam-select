import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPhotoDocument extends Document {
  eventId: mongoose.Types.ObjectId;
  driveFileId: string;
  thumbnailUrl: string;
  fullUrl: string;
  filename: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  isBlurry: boolean;
  popularity: number;
  order: number;
  createdAt: Date;
}

const PhotoSchema = new Schema<IPhotoDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    driveFileId: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    fullUrl: { type: String, required: true },
    filename: { type: String, required: true },
    width: { type: Number },
    height: { type: Number },
    aspectRatio: { type: Number },
    isBlurry: { type: Boolean, default: false },
    popularity: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PhotoSchema.index({ eventId: 1, order: 1 });

const Photo: Model<IPhotoDocument> =
  mongoose.models.Photo || mongoose.model<IPhotoDocument>("Photo", PhotoSchema);

export default Photo;
