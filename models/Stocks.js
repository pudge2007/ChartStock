var mongoose = require('mongoose');

var StockSchema = new mongoose.Schema({
  description: String,
  link: String,
  username: String
});

module.exports = mongoose.model('Stock', StockSchema);