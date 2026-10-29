import mongoose from "mongoose";

const entrySessionSchema = new mongoose.Schema({
  sessionName: { type: String, required: true, trim: true, maxlength: 120 },
  sessionDate: { type: Date, required: true, default: Date.now },
  customerName: { type: String, trim: true, default: "" },
  referenceNumber: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["Open", "Closed"], default: "Open" }
}, { timestamps: true });

export default mongoose.model("EntrySession", entrySessionSchema);
