import SteelEntry from "../models/SteelEntry.js";

export async function buildSummary(sessionId) {
  const rows = await SteelEntry.aggregate([
    { $match: { sessionId: (await import("mongoose")).default.Types.ObjectId.createFromHexString(String(sessionId)) } },
    { $group: {
      _id: { name: "$normalizedObjectName", unit: "$unit" },
      objectName: { $first: "$objectName" },
      totalQuantity: { $sum: "$quantity" },
      totalAmount: { $sum: "$totalAmount" },
      entryCount: { $sum: 1 },
      entries: { $push: {
        _id: "$_id", objectName: "$objectName", quantity: "$quantity", unit: "$unit",
        unitPrice: "$unitPrice", totalAmount: "$totalAmount", remarks: "$remarks",
        createdAt: "$createdAt", updatedAt: "$updatedAt"
      } }
    } },
    { $project: {
      _id: 0, objectName: 1, unit: "$_id.unit", totalQuantity: 1, totalAmount: 1, entryCount: 1,
      averageUnitPrice: { $cond: [{ $gt: ["$totalQuantity", 0] }, { $divide: ["$totalAmount", "$totalQuantity"] }, 0] },
      entries: 1
    } },
    { $sort: { objectName: 1, unit: 1 } }
  ]);
  const entries = await SteelEntry.find({ sessionId }).sort({ createdAt: -1 }).lean();
  const grandTotal = entries.reduce((sum, e) => sum + e.totalAmount, 0);
  const quantityByUnit = entries.reduce((acc, e) => {
    acc[e.unit] = (acc[e.unit] || 0) + e.quantity;
    return acc;
  }, {});
  return { rows, grandTotal, quantityByUnit, entryCount: entries.length };
}
