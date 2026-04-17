const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: String,
  type: String,
  amount: Number,
  category: String,
  date: Date
});

module.exports = mongoose.model('Transaction', TransactionSchema);