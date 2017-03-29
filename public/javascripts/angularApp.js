var app = angular.module('stockMarket', ['ngResource', 'ngRoute']);

app.factory('highChart', function() {
  
  return Highcharts.stockChart('chart', {
      
    title: {
      text: "Stock's OHLC"
    },
    
    yAxis: {
      labels: {
          formatter: function () {
            return (this.value > 0 ? ' + ' : '') + this.value + '%';
          }
      },
      plotLines: [{
          value: 0,
          width: 2,
          color: 'silver'
      }]
    },
    
    plotOptions: {
      series: {
        compare: 'percent',
        dataGrouping: {
          units: [[ 'week', [1] ], [ 'month', [1, 2, 3, 4, 6] ]]
        },
      }
    },
    
    navigator: {
      enabled: false
    },
    
    scrollbar: {
      enabled: false
    },
    
    tooltip: {
      pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.change}%)<br/>',
      valueDecimals: 2,
      split: true
    },
    
    series: []
    
  });
})

app.factory('socket',['$rootScope', function($rootScope) {
    var socket = io.connect();
    return {
      on: function (eventName, callback) {
        socket.on(eventName, function () {  
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        })
      }
    };
  }]);

app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
  $routeProvider
    .when('/', { templateUrl: 'partials/home.ejs', controller: 'MainCtrl'})    
  $routeProvider.otherwise({ redirectTo: "/" });
  $locationProvider.html5Mode({ enabled: true, requireBase: false});

}]);

app.controller('MainCtrl', ['$scope', '$http', 'highChart', 'socket', function($scope, $http, highChart, socket){
  
  $scope.symbol = '';
  $scope.stocks = [];
  $scope.error = '';
  var chart = highChart;
  
  function safelyParseJSON (json) {
    var parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      parsed = json;
    }
  
    return parsed;
  }
  
  socket.on('message', function(data) {
    $scope.stocks = data;
    data.forEach(function(stock) {
      $http.get('/stocks', { params: {symbol: stock.symbol }}).then(function(response) {
        chart.addSeries({ name: stock.symbol, data: response.data, type: 'areaspline'});
      })
    })
  })
  
  $scope.addStock = function () {
    if($scope.symbol){
      socket.emit('addStock', {symbol: $scope.symbol.toUpperCase()})
      $scope.symbol = '';
    }
  }
  
  socket.on('addStock', function(data) {
    var info = JSON.parse(data.info);
    $scope.stocks.push({symbol: info.Symbol, desc: info.Name});
    chart.addSeries({ name: info.Symbol, data: data.plot, type: 'areaspline' });
  })
  
  socket.on('errMsg', function(data) {
    $scope.error = data;
  })
  
  $scope.deleteStock = function (symbol) {
    socket.emit('deleteStock', {symbol: symbol})
  }
  
  socket.on('deleteStock', function(data) {
    for (var i = 0; i < chart.series.length; i++) {
      if(chart.series[i].name === data) {
        chart.series[i].remove();
        break;
      }
    } 
    for (var j = 0; j < $scope.stocks.length; j++) {
      if ($scope.stocks[j].symbol === data) {
        $scope.stocks.splice(j, 1);
        break;
      }
    }
  })
  
}]);
