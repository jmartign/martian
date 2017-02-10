(function() {
  var app;

  app = angular.module('app', ['ui.bootstrap']);

  app.controller('RedstoneCtrl', function($scope, $http, $interval) {
    var CFG;
    $scope.CFG = CFG = null;
    $http.get('/api/redstone/config').success(function(data) {
      if (typeof data === "string") {
        window.alert(data);
        return;
      }
      $scope.CFG = CFG = data;
      CFG.sourcekeys = _.keys(CFG.sources);
      $scope.addsource = 'longranger';
      return $scope.redstone = {
        from: '',
        to: '',
        desc: '',
        dtl: CFG.defaults.dtl,
        dlmax: CFG.defaults.dlmax,
        cost_est: 0,
        size_est: 0,
        bundles: []
      };
    });
    $scope.addBundle = function() {
      var id, itype, params, sname, source, stype;
      sname = $scope.addsource;
      id = $scope.addid;
      source = CFG.sources[sname];
      stype = source.type;
      if (stype === 'folder') {
        itype = 'path';
      } else {
        itype = id[0] === '/' ? 'path' : 'lena';
      }
      params = {
        sname: sname,
        stype: stype,
        id: id,
        itype: itype,
        pname: source.pname,
        paths: source.paths
      };
      return $http.post('/api/redstone/validate', params).success(function(data) {
        if (typeof data === "string") {
          window.alert(data);
          return;
        }
        console.log(data);
        $scope.makeBundle(data);
        $scope.refresh();
        if (itype === 'lena') {
          return $scope.addid = '' + (parseInt($scope.addid) + 1);
        } else {
          return $scope.addid = '';
        }
      });
    };
    $scope.makeBundle = function(data) {
      var f, j, lastBundle, len, name, ref, source, stype;
      stype = data.stype;
      if (stype === 'folder') {
        name = data.id.split("/").reverse()[0];
        name = name.replace(/\s+/g, '_').replace(/[^\d\w]+/g, '');
        return $scope.redstone.bundles.push({
          stype: stype,
          id: data.id,
          itype: 'path',
          name: name,
          files: data.files,
          fcount: _.keys(data.files).length
        });
      } else if (stype === 'pipestance') {
        source = CFG.sources[data.sname];
        if ($scope.redstone.bundles.length > 0) {
          lastBundle = $scope.redstone.bundles[$scope.redstone.bundles.length - 1];
          ref = _.keys(data.files);
          for (j = 0, len = ref.length; j < len; j++) {
            f = ref[j];
            if (lastBundle.files[f] != null) {
              data.files[f].include = lastBundle.files[f].include;
            }
          }
        }
        if (data.itype === 'lena') {
          name = data.bag.description;
        } else if (data.itype === 'path') {
          name = data.id.split("/").reverse()[0];
        }
        name = name.replace(/\s+/g, '_').replace(/[^\d\w]+/g, '');
        return $scope.redstone.bundles.push({
          stype: stype,
          sname: data.sname,
          source: source,
          container: data.container,
          id: data.id,
          itype: data.itype,
          versions: data.versions.reverse(),
          version: data.versions[0],
          bag: data.bag,
          name: "FILL THIS IN",
          files: data.files
        });
      }
    };
    $scope.refresh = function() {
      var b, bfiles, bundledeets, desc, download_cost, f, gb, j, k, l, len, len1, len2, ref, ref1, ref2, request, storage_cost, totalcost, totalsize;
      bundledeets = [];
      totalsize = 0.0;
      totalcost = 0.0;
      ref = $scope.redstone.bundles;
      for (j = 0, len = ref.length; j < len; j++) {
        b = ref[j];
        b.bsize = 0;
        ref1 = _.keys(b.files);
        for (k = 0, len1 = ref1.length; k < len1; k++) {
          f = ref1[k];
          if (b.files[f].include) {
            b.bsize += b.files[f].size;
          }
        }
        totalsize += b.bsize;
        b.hsize = Humanize.fileSize(b.bsize);
        gb = b.bsize / (1024 * 1024 * 1024);
        storage_cost = gb * CFG.prices.s3_storage_per_gbmo * ($scope.redstone.dtl / 30);
        download_cost = gb * CFG.prices.s3_download_per_gb * $scope.redstone.dlmax;
        totalcost += storage_cost + download_cost;
        b.cost = Humanize.formatNumber(storage_cost + download_cost, 2);
        bfiles = [];
        if (b.stype === "pipestance") {
          ref2 = b.source.order;
          for (l = 0, len2 = ref2.length; l < len2; l++) {
            f = ref2[l];
            if (b.files[f].include) {
              bfiles.push(f);
            }
          }
        }
        b.name = b.name.replace(/\s+/g, '_').replace(/[^\d\w]+/g, '');
        bundledeets.push([b.stype, b.sname, b.itype, b.id, b.container, b.version, b.name, bfiles.join('|')].join(','));
      }
      $scope.redstone.totalsize = Humanize.fileSize(totalsize);
      $scope.redstone.totalcost = '$' + Humanize.formatNumber(totalcost, 2);
      desc = $scope.redstone.desc;
      desc = desc.replace(/\s+/g, '_');
      desc = desc.replace(/[^\d\w]+/g, '');
      request = {
        date: moment().format(),
        from: $scope.redstone.from,
        to: $scope.redstone.to,
        desc: desc,
        dtl: $scope.redstone.dtl,
        dlmax: $scope.redstone.dlmax,
        totalsize: $scope.redstone.totalsize,
        totalcost: $scope.redstone.totalcost,
        bundles: bundledeets
      };
      return $scope.output = angular.toJson(request, 4);
    };
    return $scope.close = function(i) {
      $scope.redstone.bundles.splice(i, 1);
      return $scope.refresh();
    };
  });

  app.directive('integer', function() {
    return {
      require: 'ngModel',
      link: function(scope, elm, attrs, ctrl) {
        return ctrl.$parsers.unshift(function(viewValue) {
          if (/^\-?\d+$/.test(viewValue)) {
            ctrl.$setValidity('integer', true);
            return parseInt(viewValue, 10);
          } else {
            ctrl.$setValidity('integer', false);
            return void 0;
          }
        });
      }
    };
  });

}).call(this);