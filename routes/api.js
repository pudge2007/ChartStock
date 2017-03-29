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
  
  function getStockInfo (symbol, callback) {
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
  
  function safelyParseJSON (json) {
    var parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      parsed = 'ERROR';
    }
  
    return parsed;
  }
  
  app.get('/stocks', function(req, res) {
    var parameters = {  
      Normalized: false,
      NumberOfDays: 1826,
      DataPeriod: "Day",
      Elements: [{Symbol: req.query.symbol, Type: "price", Params: ["ohlc"]}]
    };    
    var url = 'http://dev.markitondemand.com/MODApis/Api/v2/InteractiveChart/json?parameters='+JSON.stringify(parameters);
    
    request.get({url: url, json: true, headers: {'Content-Type': 'application/json' }}, function (e, r, data) {
      res.json(getOHLC(data));
    });
    
  })
  
  io.sockets.on('connection', function (socket) {
    
    Stock.find({}, function(err, stocks) {
      if(err) throw err;
      socket.send(stocks);
    });
    
    socket.on('addStock', function(data) {
      async.parallel({
        info: function(callback){
          return getStockInfo (data.symbol, function(err, result){
            return callback(err, result);
          });
        },
        db: function(callback){
          return Stock.find({'symbol': data.symbol}, function(err, s) {
            return callback(err, s);
          });
        }  
      }, function(err, result){
          if (err) throw err;
          var info = safelyParseJSON(result.info.info);
          if (info.Status !== "SUCCESS" || info === "ERROR") {
            socket.emit('errMsg', info.Message||'Request blockedExceeded requests/sec limit');
          } else {
            if(result.db.length === 0) {
              io.sockets.emit('addStock', {info: result.info.info, plot: getOHLC(result.info.plot) });
              socket.emit('errMsg', "");
              var stock = new Stock({symbol: data.symbol, desc: info.Name});
              stock.save(function(err) {  
                if(err) throw err;
              });             
            } else {
              socket.emit('errMsg', "This stock is already used");
            } 
          }
      });
    });
  
    socket.on('deleteStock', function(data, callback) {
      io.sockets.emit('deleteStock', data.symbol)
      Stock.remove({'symbol': data.symbol}, function(err){
        if(err) throw err;
      })
    })
    
  });
};
