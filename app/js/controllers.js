'use strict';

/* Controllers */

function mkUpdateOrderBy($scope) {
    return function(column) {
        var rev = column == $scope.orderProp;
        $scope.sortCls = {};
        $scope.sortCls[column] = 'sort-' + (rev ? 'desc' : 'asc');
        if (rev) {
            column = '-' + column;
        }
        $scope.orderProp = column;
    };
}

function mkAllSelected($scope, key) {
    return function () {
        var collection = $scope[key];
        if (collection.length == 0) {
            return false;
        }
        return collection.every(function (item) {
            return item.selected;
        });
    };
}

function mkNothingSelected($scope, key) {
    return function() {
        var collection = $scope[key];
        return !collection.some(function (item) {
            return item.selected;
        });
    };
}

function mkToggleAll($scope, key, allSelected) {
    return function() {
        var collection = $scope[key];
        var newValue = !allSelected();
        collection.forEach(function (item) {
            item.selected = newValue;
        });
    };
}

function mkDownloadLink($scope, key) {
    return function() {
        var collection = $scope[key];
        var name = null;
        collection.some(function (item) {
            if (item.selected) {
                name = item.name;
            }
            return item.selected;
        });
        return name;
    };
}

angular.module('swiftBrowser.controllers',
               ['swiftBrowser.swift', 'ui.bootstrap', 'ui.codemirror'])
    .controller('RootCtrl', ['$scope', '$swift', function($scope, $swift) {
        $scope.containers = [];
        $scope.updateOrderBy = mkUpdateOrderBy($scope);
        $scope.updateOrderBy('name');

        $scope.allSelected = mkAllSelected($scope, 'containers');
        $scope.toggleAll = mkToggleAll($scope, 'containers',
                                       $scope.allSelected);
        $scope.nothingSelected = mkNothingSelected($scope, 'containers');

        $swift.listContainers().then(function (result) {
            $scope.containers = result.data;
        });
    }])
    .controller('ContainerCtrl', [
        '$scope', '$swift', '$stateParams', '$location', '$modal',
        function($scope, $swift, $stateParams, $location, $modal) {
            var container = $stateParams.container;
            var prefix = $stateParams.prefix || '';
            $scope.container = container;
            $scope.updateOrderBy = mkUpdateOrderBy($scope);
            $scope.updateOrderBy('name');

            $scope.items = [];
            $scope.allSelected = mkAllSelected($scope, 'items');
            $scope.toggleAll = mkToggleAll($scope, 'items', $scope.allSelected);
            $scope.nothingSelected = mkNothingSelected($scope, 'items');
            $scope.downloadLink = mkDownloadLink($scope, 'items');

            $scope.delete = function () {
                var scope = $scope.$new(true);
                scope.items = [];
                $scope.items.forEach(function (item, idx) {
                    if (item.selected) {
                        var copy = angular.copy(item);
                        copy.idx = idx;
                        scope.items.push(copy);
                    }
                });
                scope.updateOrderBy = mkUpdateOrderBy(scope);
                scope.updateOrderBy('name');
                scope.allSelected = mkAllSelected(scope, 'items');
                scope.toggleAll = mkToggleAll(scope, 'items',
                                              scope.allSelected);
                scope.nothingSelected = mkNothingSelected(scope, 'items');

                var opt = {templateUrl: 'partials/delete-modal.html',
                           scope: scope};
                var inst = $modal.open(opt);
                inst.result.then(function () {
                    scope.items.forEach(function (item) {
                        if (item.selected) {
                            var req;
                            if (item.subdir) {
                                req = $swift.deleteDirectory(container,
                                                             item.name);
                            } else {
                                req = $swift.deleteObject(container,
                                                          item.name);
                            }
                            req.then(function () {
                                delete $scope.items[item.idx];
                            });
                        }
                    });
                });
            };

            $scope.upload = function () {
                var scope = $scope.$new(true);
                scope.files = [];
                scope.path = container + '/' + prefix;
                scope.fileSelected = function(elm) {
                    // Since fileSelected is called from a non-Angular
                    // event handler, we need to inform the scope
                    // about the update. Otherwise the update won't be
                    // noticed until the next digest cycle.
                    scope.$apply(function () {
                        for (var i = 0; i < elm.files.length; i++) {
                            var file = elm.files[i];
                            file.uploadPct = null;
                            scope.files.push(file);
                        }
                    });
                };
                scope.remove = function(idx) {
                    scope.files.splice(idx, 1);
                };

                var opt = {templateUrl: 'partials/upload-modal.html',
                           scope: scope};
                $modal.open(opt);

                scope.uploadFiles = function() {
                    scope.files.forEach(function (file) {
                        if (file.uploadPct == 100) {
                            return;
                        }
                        var name = prefix + file.name;
                        var item = {name: name,
                                    title: file.name,
                                    bytes: file.size};
                        file.uploadPct = 0;
                        var upload = $swift.uploadObject(container, name,
                                                         file);
                        upload.progress(function (evt) {
                            if (evt.lengthComputable) {
                                var frac = evt.loaded / evt.total;
                                file.uploadPct = parseInt(100.0 * frac);
                            }
                        });
                        upload.success(function() {
                            $scope.items.push(item);
                            file.uploadPct = 100;
                        });
                    });
                };

                scope.disableUpload = function() {
                    return scope.files.every(function (file) {
                        return file.uploadPct != null;
                    });
                };
            };

            $scope.breadcrumbs = [{name: '', title: 'Root'}];

            var parts = prefix.split('/');
            parts.unshift(container);
            for (var i = 0; i < parts.length - 1; i++) {
                var crumb = {name: parts.slice(0, i + 1).join('/') + '/',
                             title: parts[i]};
                $scope.breadcrumbs.push(crumb);
            }

            var params = {prefix: prefix, delimiter: '/'};
            $swift.listObjects(container, params).then(function (result) {
                $scope.items = $.map(result.data, function (item) {
                    var parts = (item.subdir || item.name).split('/');

                    if (item.subdir) {
                        return {name: item.subdir,
                                title: parts[parts.length - 2] + '/',
                                bytes: '\u2014', // em dash
                                subdir: true};
                    } else {
                        item.title = parts[parts.length - 1];
                        return item;
                    }
                });
            });
        }
    ])
    .controller('ObjectCtrl', [
        '$scope', '$stateParams', '$swift', '$location', '$modal',
        '$timeout', '$q',
        function ($scope, $stateParams, $swift, $location, $modal,
                  $timeout, $q) {
            var container = $stateParams.container;
            var name = $stateParams.name;

            $scope.breadcrumbs = [{name: '', title: 'Root'}];
            var parts = name.split('/');
            parts.unshift(container);
            for (var i = 0; i < parts.length; i++) {
                var crumb = {name: parts.slice(0, i + 1).join('/') + '/',
                             title: parts[i]};
                $scope.breadcrumbs.push(crumb);
            }

            var params = {prefix: name, delimiter: '/'};
            $swift.listObjects(container, params).then(function (result) {
                var redirect = result.data.some(function (item) {
                    if (item.subdir == name + '/') {
                        // Add trailing slash for pseudo-directory
                        $location.path($location.path() + '/');
                        return true;
                    }
                });
                if (redirect) {
                    return;
                }

                var headers = {meta: [], sys: []};
                $scope.container = container;
                $scope.name = name;
                $scope.reset = function () {
                    $scope.headers = angular.copy(headers);
                };
                $scope.save = function() {
                    var flattened = {};
                    $scope.headers.sys.forEach(function (header) {
                        if (header.editable) {
                            flattened[header.name] = header.value;
                        }
                    });
                    $scope.headers.meta.forEach(function (header) {
                        if (header.name) {
                            flattened[header.name] = header.value;
                        }
                    });
                    var req = $swift.postObject(container, name, flattened);
                    req.then(function (result) {
                        $scope.headers.meta.forEach(function (header) {
                            header.added = false;
                        });
                        $scope.headers.sys.forEach(function (header) {
                            header.added = false;
                        });
                        headers = angular.copy($scope.headers);
                    });
                };
                $scope.remove = function (type, idx) {
                    $scope.headers[type].splice(idx, 1);
                };
                $scope.isUnchanged = function () {
                    return angular.equals($scope.headers, headers);
                };
                $scope.add = function (type) {
                    if (type == 'meta') {
                        $scope.headers.meta.push({name: 'x-object-meta-',
                                                  value: '',
                                                  added: true});
                    } else {
                        // Use first removable header as default value
                        var name = $scope.removableHeaders[0];
                        $scope.headers.sys.push({name: name,
                                                 value: '',
                                                 added: true,
                                                 editable: true,
                                                 removable: true});
                    }
                };

                $scope.show = function () {
                    // To prevent a blank editor showing, we need to
                    // refresh it after opening the modal. We will
                    // capture the editor here and refresh it below.
                    var pendingEditor = $q.defer();
                    var scope = $scope.$new(true);
                    scope.name = name;
                    scope.editor = {
                        content: '',
                        options: {
                            onLoad: pendingEditor.resolve,
                            lineNumbers: true,
                            readOnly: true
                        }
                    };
                    $swift.getObject(container, name).then(function (result) {
                        scope.editor.content = result.data;
                    });
                    var opts = {templateUrl: 'partials/show-modal.html',
                                scope: scope,
                                size: 'lg'};
                    $modal.open(opts).opened.then(function () {
                        pendingEditor.promise.then(function (editor) {
                            $timeout(editor.refresh.bind(editor));
                        });
                    });
                };

                $swift.headObject(container, name).then(function (result) {
                    var allHeaders = result.headers();
                    var editableHeaders = [
                        'content-type',
                        'content-encoding',
                        'content-disposition',
                        'x-delete-at'
                    ];
                    $scope.removableHeaders = [
                        'content-encoding',
                        'content-disposition',
                        'x-delete-at'
                    ];
                    var sysHeaders = [
                        'last-modified',
                        'content-length',
                        'content-type',
                        'etag',
                        'content-encoding',
                        'content-disposition',
                        'x-delete-at',
                        'x-object-manifest',
                        'x-static-large-object'
                    ];
                    angular.forEach(allHeaders, function (value, name) {
                        var header = {name: name, value: value};
                        if (name.indexOf('x-object-meta-') == 0) {
                            headers.meta.push(header);
                        } else if (sysHeaders.indexOf(name) > -1) {
                            if (editableHeaders.indexOf(name) > -1) {
                                header.editable = true;
                            }
                            if ($scope.removableHeaders.indexOf(name) > -1) {
                                header.removable = true;
                            }
                            headers.sys.push(header);
                        }
                        headers.meta.sort();
                        headers.sys.sort();
                        $scope.reset();
                    });
                });
            });
        }
    ]);
