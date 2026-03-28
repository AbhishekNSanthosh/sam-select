import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAlbumDocument extends Document {
  eventId: mongoose.Types.ObjectId;
  selectedPhotoIds: mongoose.Types.ObjectId[];
  status: "draft" | "submitted" | "approved" | "changes_requested";
  submittedAt?: Date;
  lockedAt?: Date;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AlbumSchema = new Schema<IAlbumDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
    },
    selectedPhotoIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Photo",
      },
    ],
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "changes_requested"],
      default: "draft",
    },
    submittedAt: { type: Date },
    lockedAt: { type: Date },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

AlbumSchema.index({ status: 1 });

const Album: Model<IAlbumDocument> =
  mongoose.models.Album || mongoose.model<IAlbumDocument>("Album", AlbumSchema);

export default Album;
