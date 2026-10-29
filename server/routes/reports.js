import { Router } from "express";
import mongoose from "mongoose";
import ExcelJS from "exceljs";
import EntrySession from "../models/EntrySession.js";
import SteelEntry from "../models/SteelEntry.js";
import { buildSummary } from "../utils/summary.js";

const router = Router();
router.get("/:sessionId/summary", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.sessionId)) return res.status(400).json({ success: false, message: "Invalid session ID" });
    const session = await EntrySession.findById(req.params.sessionId).lean();
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    res.json({ success: true, data: await buildSummary(session._id) });
  } catch (e) { next(e); }
});

router.get("/:sessionId/export", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.sessionId)) return res.status(400).json({ success: false, message: "Invalid session ID" });
    const session = await EntrySession.findById(req.params.sessionId).lean();
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    const summary = await buildSummary(session._id);
    const entries = await SteelEntry.find({ sessionId: session._id }).sort({ createdAt: 1 }).lean();
    const wb = new ExcelJS.Workbook();
    wb.creator = "Steel Shop Management";
    wb.created = new Date();

    const ws = wb.addWorksheet("Consolidated Summary");
    ws.addRow([`Steel Shop Report — ${session.sessionName}`]);
    ws.addRow([`Session date: ${new Date(session.sessionDate).toLocaleDateString("en-IN")}`]);
    ws.addRow([]);
    ws.addRow(["S.No.", "Object Name", "Total Quantity", "Unit", "Average Unit Price (₹)", "Total Amount (₹)", "Number of Entries"]);
    summary.rows.forEach((r, i) => ws.addRow([i + 1, r.objectName, r.totalQuantity, r.unit, r.averageUnitPrice, r.totalAmount, r.entryCount]));
    ws.addRow([]);
    ws.addRow(["", "Grand Total", "", "", "", summary.grandTotal, ""]);
    ws.addRow(["", "Quantity subtotals by unit"]);
    Object.entries(summary.quantityByUnit).forEach(([unit, qty]) => ws.addRow(["", unit, qty, unit]));
    ws.getRow(4).font = { bold: true };
    ws.getRow(4).autoFilter = { from: 1, to: 7 };
    ws.views = [{ state: "frozen", ySplit: 4 }];
    ws.columns = [{ width: 9 }, { width: 28 }, { width: 18 }, { width: 12 }, { width: 23 }, { width: 20 }, { width: 20 }];
    ws.getColumn(5).numFmt = '₹#,##0.00';
    ws.getColumn(6).numFmt = '₹#,##0.00';

    const detail = wb.addWorksheet("Individual Entries");
    detail.addRow([`Individual Entries — ${session.sessionName}`]);
    detail.addRow([`Session date: ${new Date(session.sessionDate).toLocaleDateString("en-IN")}`]);
    detail.addRow([]);
    detail.addRow(["Entry ID", "Date and Time", "Object Name", "Quantity", "Unit", "Price per Unit (₹)", "Total Amount (₹)", "Remarks"]);
    entries.forEach(e => detail.addRow([String(e._id), e.createdAt, e.objectName, e.quantity, e.unit, e.unitPrice, e.totalAmount, e.remarks || ""]));
    detail.getRow(4).font = { bold: true };
    detail.getRow(4).autoFilter = { from: 1, to: 8 };
    detail.views = [{ state: "frozen", ySplit: 4 }];
    detail.columns = [{ width: 27 }, { width: 23 }, { width: 28 }, { width: 14 }, { width: 12 }, { width: 22 }, { width: 22 }, { width: 32 }];
    detail.getColumn(2).numFmt = "dd-mmm-yyyy hh:mm";
    detail.getColumn(6).numFmt = '₹#,##0.00';
    detail.getColumn(7).numFmt = '₹#,##0.00';

    const buffer = await wb.xlsx.writeBuffer();
    const date = new Date(session.sessionDate).toISOString().slice(0, 10);
    const filename = `Steel_Shop_Report_${date}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (e) { next(e); }
});
export default router;
