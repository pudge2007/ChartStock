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

app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
  $routeProvider
    .when('/', { templateUrl: 'partials/home.ejs', controller: 'MainCtrl'})    
  $routeProvider.otherwise({ redirectTo: "/" });
  $locationProvider.html5Mode({ enabled: true, requireBase: false});

}]);

app.controller('MainCtrl', ['$scope', '$http', 'highChart', function($scope, $http, highChart){
  
  $scope.symbol = '';
  $scope.stocks = [];
  var socket = io.connect();
  var chart = highChart;
  
  $http.get('/stocks').then(function(response){
    response.data.forEach(function(item) {
      var info = JSON.parse(item.info);
      $scope.stocks.push({name: info.Name, symbol: info.Symbol});
      chart.addSeries({ name: info.Symbol, data: item.plot, type: 'areaspline' });
    })
  })
  
  $scope.addStock = function () {
    if($scope.symbol){
      socket.emit('addStock', {symbol: $scope.symbol.toUpperCase()})
      $scope.symbol = '';
    }
  }
  
  socket.on('getStock', function(data) {
    var info = JSON.parse(data.info);
    $scope.stocks.push({name: info.Name, symbol: info.Symbol});
    chart.addSeries({ name: info.Symbol, data: data.plot, type: 'areaspline' });
  })
  
  $scope.deleteStock = function (symbol) {
    socket.emit('deleteStock', {symbol: symbol}, function(data) {
      if(data){
        chart.series[0].remove();
      }
    })
  }
  
}]);
