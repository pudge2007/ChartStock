var mongoose = require('mongoose');

var StockSchema = new mongoose.Schema({
  symbol: String,
  desc: String
});

module.exports = mongoose.model('Stock', StockSchema);