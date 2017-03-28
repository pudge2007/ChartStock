var request = require('request');
var async = require('async');
var Stock = require('../models/Stocks');

module.exports = function (app, io) {
  
  function fixDate (dateIn) {
    var dat = new Date(dateIn);
    return Date.UTC(dat.getFullYear(), dat.getMonth(), dat.getDate());
  };

  function getOHLC (json) {
    var dates = json.Dates || [];
    var elements = json.Elements || [];
    var chartSeries = [];

    if (elements[0]){
      for (var i = 0, datLen = dates.length; i < datLen; i++) {
          var dat = fixDate( dates[i] );
          var pointData = [
              dat,
              elements[0].DataSeries['open'].values[i],
              elements[0].DataSeries['high'].values[i],
              elements[0].DataSeries['low'].values[i],
              elements[0].DataSeries['close'].values[i]
          ];
          chartSeries.push( pointData );
      };
    }
    return chartSeries;
  };
  
  function getStockInfo (item, i, callback) {
    var symbol;
    
    (i === 'all') ? symbol = item.stock : symbol = item;
    
    var parameters = {  
      Normalized: false,
      NumberOfDays: 1826,
      DataPeriod: "Day",
      Elements: [{Symbol: symbol, Type: "price", Params: ["ohlc"]}]
    };    
    var url = 'http://dev.markitondemand.com/MODApis/Api/v2/InteractiveChart/json?parameters='+JSON.stringify(parameters);
    
    async.parallel({
      info: function(callback){
        return request.get('http://dev.markitondemand.com/MODApis/Api/v2/Quote/json?symbol=' + symbol, function (e, r, info) {
          return callback(e, info);
        });
      },
      plot: function(callback){
        return request.get({url: url, json: true, headers: {'Content-Type': 'application/json' }}, function (e, r, data) {
          return callback(e, data);
        });
      }  
    }, function(err, result){
        if(err) return callback(err);
        callback(null, result);
    });    
  }
  
  app.get('/stocks', function(req, res) {
    var results = [];
    var count = 0;
    Stock.find({}, 'stock', function(error, stocks) {
      stocks.forEach(function(stock) {
        getStockInfo (stock, 'all', function(err, result) {
          if(err) throw err;
          results.push({info: result.info, plot: getOHLC(result.plot) });
          count ++;
          if(count === stocks.length) res.json(results)
        });
      })
    });
  })
  
  io.sockets.on('connection', function (socket) {
  
  socket.on('addStock', function(data) {
    var stock = new Stock({stock: data.symbol});
/*    stock.save(function(err, stock) {*/
     /* if(err) throw err;*/
        getStockInfo (data.symbol, 'single', function(err, result){
          if (err) throw err;
          io.sockets.emit('getStock', {info: result.info, plot: getOHLC(result.plot) });
        });
/*    })   */
  })

  socket.on('deleteStock', function(data, callback) {
    Stock.remove({'stock': data.symbol}, function(err, data){
      if(err) throw err;
      callback(true);
    })
  })
    
  });
};
