const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name:   { type: String, default: "My Goal" },
  target: { type: Number, required: true },
  saved:  { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Goal', GoalSchema);