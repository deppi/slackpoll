'use strict';

// Declare app level module which depends on views, and components
angular.module('slackUI', [
  'ngRoute',
  'myApp.view1',
  'myApp.view2',
  'myApp.version',
  'voteUI.VoteController'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/vote'});
}]);