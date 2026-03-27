import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEventDocument extends Document {
  name: string;
  clientName: string;
  eventDate: Date;
  pin: string;
  description?: string;
  coverPhoto?: string;
  status: "active" | "locked" | "archived";
  totalPhotos: number;
  minSelection?: number;
  maxSelection?: number;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEventDocument>(
  {
    name: { type: String, required: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    eventDate: { type: Date, required: true },
    pin: { type: String, required: true, minlength: 4, maxlength: 12 },
    description: { type: String, trim: true },
    coverPhoto: { type: String },
    status: {
      type: String,
      enum: ["active", "locked", "archived"],
      default: "active",
    },
    totalPhotos: { type: Number, default: 0 },
    minSelection: { type: Number },
    maxSelection: { type: Number },
  },
  { timestamps: true }
);

EventSchema.index({ pin: 1 });
EventSchema.index({ status: 1 });

const Event: Model<IEventDocument> =
  mongoose.models.Event || mongoose.model<IEventDocument>("Event", EventSchema);

export default Event;
