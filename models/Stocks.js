var mongoose = require('mongoose');

var StockSchema = new mongoose.Schema({
  stock: String
});

module.exports = mongoose.model('Stock', StockSchema);