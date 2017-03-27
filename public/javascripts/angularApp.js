var app = angular.module('stockMarket', ['ngResource', 'ngRoute']);


/*app.config(['$routeProvider', '$locationProvider', '$httpProvider', function($routeProvider, $locationProvider, $httpProvider) {

  $routeProvider
    .when('/', { templateUrl: 'partials/home.ejs', controller: 'MainCtrl'})
  $routeProvider.otherwise({ redirectTo: "/" });
  $locationProvider.html5Mode({ enabled: true, requireBase: false});

}]);*/


app.controller('MainCtrl', ['$scope', 'getUsername', function($scope, getUsername){
  var socket = io.connect();
  
  $scope.desc = '';
  $scope.link ='';
  $scope.createStock = function() {
    var stock = {desc: $scope.desc};
    socket.emit('postStock', stock);
  };
  
  $scope.deletePoll = function(id){
    socket.emit('deleteStock', id, function(data) {
    });
  }
}]);
