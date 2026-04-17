const router = require('express').Router();
const Transaction = require('../models/Transaction');

// ── ADD ───────────────────────────────────────────────────────────
router.post('/add', async (req, res) => {
  try {
    const tx = new Transaction(req.body);
    await tx.save();
    res.json({ msg: "Transaction added", success: true });
  } catch (err) {
    console.error("Add transaction error:", err);
    res.status(500).json({ msg: "Failed to add transaction" });
  }
});

// ── GET ALL FOR USER ──────────────────────────────────────────────
router.get('/:userId', async (req, res) => {
  try {
    const data = await Transaction.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(data);
  } catch (err) {
    console.error("Get transactions error:", err);
    res.status(500).json({ msg: "Failed to fetch transactions" });
  }
});

// ── DELETE ────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ msg: "Deleted", success: true });
  } catch (err) {
    console.error("Delete transaction error:", err);
    res.status(500).json({ msg: "Failed to delete transaction" });
  }
});

// ── UPDATE ────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    await Transaction.findByIdAndUpdate(req.params.id, req.body);
    res.json({ msg: "Updated", success: true });
  } catch (err) {
    console.error("Update transaction error:", err);
    res.status(500).json({ msg: "Failed to update transaction" });
  }
});

// ── IMPORTANT: module.exports must be at the BOTTOM ──────────────
module.exports = router;