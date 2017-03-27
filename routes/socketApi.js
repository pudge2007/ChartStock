var mongoose = require('mongoose');
var Stock = require('../models/Stocks');

module.exports = function(io) {
  
  io.sockets.on('connection', function (socket) {
    function find() {
      Stock.find({}, function(error, stocks) {
        io.sockets.emit('getStocks', stocks);
      });
    }  
    
    // API-интерфейс для создания стока
    socket.on('postStock', function(data) {
      var stockObj = {description: data.desc, link: data.link};
      var stock = new Stock(stockObj);
      stock.save(function(err) {
        if(err) throw err;
        find();
      });
    });
    
    // API-интерфейс для удаления стока
    socket.on('deleteStock', function(data, callback) {
      callback(true);
      Stock.remove({ _id: data}, function(err, data){
        if(err) throw err;
        find();
      })
    })
    
  });
};