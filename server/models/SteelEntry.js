import mongoose from "mongoose";

export const UNITS = ["KG", "PCS", "TON", "METER", "BUNDLE", "OTHER"];

const steelEntrySchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "EntrySession", required: true, index: true },
  objectName: { type: String, required: true, trim: true, maxlength: 160 },
  normalizedObjectName: { type: String, required: true, index: true },
  quantity: { type: Number, required: true, min: 0.000001 },
  unit: { type: String, required: true, enum: UNITS, index: true },
  unitPrice: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  remarks: { type: String, trim: true, default: "", maxlength: 500 }
}, { timestamps: true });

steelEntrySchema.index({ sessionId: 1, normalizedObjectName: 1, unit: 1 });
export default mongoose.model("SteelEntry", steelEntrySchema);
