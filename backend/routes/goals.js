const router = require('express').Router();
const Goal = require('../models/Goal');

// ── SET / ADD GOAL ────────────────────────────────────────────────
router.post('/set', async (req, res) => {
  try {
    const goal = new Goal(req.body);
    await goal.save();
    res.json({ msg: "Goal saved", success: true });
  } catch (err) {
    console.error("Add goal error:", err);
    res.status(500).json({ msg: "Failed to save goal" });
  }
});

// ── GET ALL GOALS FOR USER ────────────────────────────────────────
router.get('/:userId', async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.params.userId });
    res.json(goals);
  } catch (err) {
    console.error("Get goals error:", err);
    res.status(500).json({ msg: "Failed to fetch goals" });
  }
});

// ── DELETE GOAL ───────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await Goal.findByIdAndDelete(req.params.id);
    res.json({ msg: "Goal deleted", success: true });
  } catch (err) {
    console.error("Delete goal error:", err);
    res.status(500).json({ msg: "Failed to delete goal" });
  }
});

// ── UPDATE GOAL SAVED AMOUNT ──────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    await Goal.findByIdAndUpdate(req.params.id, req.body);
    res.json({ msg: "Goal updated", success: true });
  } catch (err) {
    console.error("Update goal error:", err);
    res.status(500).json({ msg: "Failed to update goal" });
  }
});

module.exports = router;