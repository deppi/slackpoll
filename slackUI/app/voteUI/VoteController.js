'use strict';

angular.module('voteUI.VoteController', ['ngRoute', 'nvd3'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/vote/voteHash/:voteHash', {
    templateUrl: 'voteUI/voteUI.html',
    controller: 'VoteController'
  });
}])

.controller('VoteController', ['$scope', '$routeParams', '$http', function($scope, $routeParams, $http) {
	$scope.isLoading = true;
	$scope.voteHash = $routeParams.voteHash;
	

	$http.get('http://localhost:3000/vote/' + $scope.voteHash).then(function(response) {
		var data = response.data;
		$scope.data = [];
		$scope.title = data.questionText;
		var dataPoints = [];
		var flag = false;
		for (var voteOption in data.votes) {
			if (data.votes[voteOption].length > 0) flag = true;
			if (data.votes[voteOption].length !== 0) dataPoints.push({key:voteOption, y: data.votes[voteOption].length});
		}
		$scope.data = flag ? dataPoints : [ {key: "No votes!", y: 1} ];
		$scope.options = {
			chart: {
	            type: 'pieChart',
	            height: 500,
	            x: function(d){return d.key;},
	            y: function(d){return d.y;},
	            showLabels: true,
	            transitionDuration: 500,
	            labelThreshold: 0.01,
				legend: {
			        vers: 'furious',
		        },
  				legendPosition: 'top'
        	}
		};
		$scope.isLoading = false;
	}, function() {
		console.log("error");
		$scope.isLoading = false;
	});
}]);