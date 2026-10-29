import { Router } from "express";
import mongoose from "mongoose";
import EntrySession from "../models/EntrySession.js";
import SteelEntry, { UNITS } from "../models/SteelEntry.js";

const router = Router();
const validId = id => mongoose.isValidObjectId(id);

router.get("/session/:sessionId", async (req, res, next) => {
  try {
    if (!validId(req.params.sessionId)) return res.status(400).json({ success: false, message: "Invalid session ID" });
    const entries = await SteelEntry.find({ sessionId: req.params.sessionId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: entries });
  } catch (e) { next(e); }
});

router.post("/session/:sessionId", async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!validId(sessionId)) return res.status(400).json({ success: false, message: "Invalid session ID" });
    const session = await EntrySession.findById(sessionId);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    if (session.status !== "Open") return res.status(409).json({ success: false, message: "This session is closed. Reopen it before adding entries." });
    const objectName = String(req.body.objectName || "").trim();
    const quantity = Number(req.body.quantity);
    const unitPrice = Number(req.body.unitPrice);
    const unit = String(req.body.unit || "");
    if (!objectName) return res.status(400).json({ success: false, message: "Object name is required" });
    if (!Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ success: false, message: "Quantity must be greater than zero" });
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return res.status(400).json({ success: false, message: "Unit price cannot be negative" });
    if (!UNITS.includes(unit)) return res.status(400).json({ success: false, message: "Select a valid unit" });
    const totalAmount = Math.round((quantity * unitPrice + Number.EPSILON) * 100) / 100;
    const entry = await SteelEntry.create({
      sessionId, objectName, normalizedObjectName: objectName.toLocaleLowerCase("en").replace(/\s+/g, " "),
      quantity, unit, unitPrice, totalAmount, remarks: req.body.remarks || ""
    });
    res.status(201).json({ success: true, data: entry });
  } catch (e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid entry ID" });
    const existing = await SteelEntry.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Entry not found" });
    const session = await EntrySession.findById(existing.sessionId);
    if (!session || session.status !== "Open") return res.status(409).json({ success: false, message: "Reopen the session before editing entries." });
    const objectName = String(req.body.objectName ?? existing.objectName).trim();
    const quantity = Number(req.body.quantity ?? existing.quantity);
    const unitPrice = Number(req.body.unitPrice ?? existing.unitPrice);
    const unit = String(req.body.unit ?? existing.unit);
    if (!objectName || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || !UNITS.includes(unit))
      return res.status(400).json({ success: false, message: "Check object name, quantity, unit and price." });
    Object.assign(existing, {
      objectName, normalizedObjectName: objectName.toLocaleLowerCase("en").replace(/\s+/g, " "),
      quantity, unit, unitPrice, totalAmount: Math.round((quantity * unitPrice + Number.EPSILON) * 100) / 100,
      remarks: req.body.remarks ?? existing.remarks
    });
    await existing.save();
    res.json({ success: true, data: existing });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid entry ID" });
    const entry = await SteelEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: "Entry not found" });
    const session = await EntrySession.findById(entry.sessionId);
    if (!session || session.status !== "Open") return res.status(409).json({ success: false, message: "Reopen the session before deleting entries." });
    await entry.deleteOne();
    res.json({ success: true, message: "Entry deleted" });
  } catch (e) { next(e); }
});

export default router;
