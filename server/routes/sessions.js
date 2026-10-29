import { Router } from "express";
import mongoose from "mongoose";
import EntrySession from "../models/EntrySession.js";
import SteelEntry from "../models/SteelEntry.js";
import { buildSummary } from "../utils/summary.js";

const router = Router();
const validId = id => mongoose.isValidObjectId(id);

router.get("/", async (req, res, next) => {
  try {
    const sessions = await EntrySession.find().sort({ sessionDate: -1, createdAt: -1 }).lean();
    const output = await Promise.all(sessions.map(async s => {
      const stats = await buildSummary(s._id);
      return { ...s, grandTotal: stats.grandTotal, uniqueObjects: stats.rows.length, entryCount: stats.entryCount };
    }));
    res.json({ success: true, data: output });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const { sessionName, sessionDate, customerName = "", referenceNumber = "" } = req.body;
    if (!String(sessionName || "").trim()) return res.status(400).json({ success: false, message: "Session name is required" });
    const session = await EntrySession.create({ sessionName: String(sessionName).trim(), sessionDate: sessionDate || new Date(), customerName, referenceNumber });
    res.status(201).json({ success: true, data: session });
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid session ID" });
    const session = await EntrySession.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    const summary = await buildSummary(session._id);
    res.json({ success: true, data: { ...session, ...summary } });
  } catch (e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid session ID" });
    const session = await EntrySession.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    res.json({ success: true, data: session });
  } catch (e) { next(e); }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid session ID" });
    if (!["Open", "Closed"].includes(req.body.status)) return res.status(400).json({ success: false, message: "Status must be Open or Closed" });
    const session = await EntrySession.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    res.json({ success: true, data: session });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid session ID" });
    const session = await EntrySession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    await SteelEntry.deleteMany({ sessionId: session._id });
    await session.deleteOne();
    res.json({ success: true, message: "Session and its entries deleted" });
  } catch (e) { next(e); }
});

export default router;
