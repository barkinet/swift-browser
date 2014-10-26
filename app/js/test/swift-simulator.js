/* global SparkMD5: false */
'use strict';

function byProperty(prop) {
    return function (a, b) {
        if (a[prop] < b[prop]) {
            return -1;
        } else if (a[prop] > b[prop]) {
            return 1;
        }
        return 0;
    };
}

function escape(string) {
    return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
}

function parseQueryString(qs) {
    var params = {};
    var parts = qs.split('&');
    for (var i = 0; i < parts.length; i++) {
        var keyvalue = parts[i].split('=');
        var key = decodeURIComponent(keyvalue[0]);
        var value = decodeURIComponent(keyvalue[1]);
        params[key] = value;
    }
    return params;
}

function accountUrl() {
    var path = window.location.pathname;
    return path.split('/').slice(0, 3).join('/');
}

window.getFromInjector = function(service) {
    var html = document.querySelector("html");
    var injector = angular.element(html).injector();
    return injector.get(service);
};


function SwiftSimulator($httpBackend) {
    this.reset();

    var prefix = escape(accountUrl() + '/');
    var container = '([^/]+?)';
    var object = '(.+)';
    var qsOrEmpty = '(?:' + escape('?') + '(.*)|$)';
    this.listRegex = new RegExp(prefix + container + qsOrEmpty);
    this.objRegex = new RegExp(prefix + container + escape('/') + object);

    $httpBackend.whenGET(accountUrl())
        .respond(this.listContainers.bind(this));
    $httpBackend.whenGET(this.listRegex)
        .respond(this.listObjects.bind(this));

    $httpBackend.whenGET(this.objRegex)
        .respond(this.getObject.bind(this));
    $httpBackend.when('HEAD', this.objRegex)
        .respond(this.headObject.bind(this));
    $httpBackend.whenPOST(this.objRegex)
        .respond(this.postObject.bind(this));
    $httpBackend.whenDELETE(this.objRegex)
        .respond(this.deleteObject.bind(this));
    $httpBackend.whenPUT(this.objRegex)
        .respond(this.putObject.bind(this));

    $httpBackend.whenGET(/.*/).passThrough();
}

SwiftSimulator.prototype.reset = function() {
    this.data = {};
};

SwiftSimulator.prototype.findContainerOr404 = function (url, callback) {
    var match = url.match(this.objRegex);
    var containerName = match[1];
    var objectName = match[2];

    var container = this.data[containerName];
    if (!container) {
        return [404, 'Container "' + containerName + '" not found'];
    }
    return callback(container, containerName, objectName);
};

SwiftSimulator.prototype.findObjectOr404 = function (url, callback) {
    return this.findContainerOr404(url, function (container, contName, name) {
        var object = container.objects[name];
        if (!object) {
            return [404, 'Not Found'];
        }
        return callback(container, object, contName, name);
    });
};

SwiftSimulator.prototype.listContainers = function(method, url, data) {
    var results = [];
    angular.forEach(this.data, function (container, name) {
        var result = {count: 0, bytes: 0, name: name};
        angular.forEach(container.objects, function (object) {
            result.count += 1;
            result.bytes += object.headers['Content-Length'];
        });
        results.push(result);
    });
    results.sort(byProperty('name'));
    return [200, results];
};

SwiftSimulator.prototype.listObjects = function(method, url, data) {
    var params = {prefix: '', delimiter: null};
    var match = url.match(this.listRegex);
    var contName = match[1];
    var qs = match[2];
    if (qs) {
        angular.extend(params, parseQueryString(qs));
    }
    var prefix = params.prefix;
    var delimiter = params.delimiter;
    var results = [];
    var subdirs = {};
    var container = this.data[contName];
    if (!container) {
        return [404, 'Container "' + contName + '" not found'];
    }

    angular.forEach(container.objects, function (object, name) {
        if (name.indexOf(prefix) == 0) {
            var idx = name.indexOf(delimiter, prefix.length);
            if (idx > -1) {
                var subdir = name.slice(0, idx + 1);
                if (!subdirs[subdir]) {
                    results.push({subdir: subdir});
                    subdirs[subdir] = true;
                }
            } else {
                var lastModified = new Date(object.headers['Last-Modified']);
                results.push({
                    'hash': object.headers.ETag,
                    'content_type': object.headers['Content-Type'],
                    'last_modified': lastModified.toISOString(),
                    'bytes': object.headers['Content-Length'],
                    'name': name
                });
            }
        }
    });
    results.sort(byProperty('name'));
    return [200, results];
};

SwiftSimulator.prototype.deleteObject = function(method, url, data) {
    return this.findObjectOr404(url, function (cont, obj, contName, name) {
        delete cont.objects[name];
        return [204, null];
    });
};

SwiftSimulator.prototype.headObject = function(method, url, data) {
    return this.findObjectOr404(url, function (container, object) {
        return [200, null, object.headers];
    });
};

SwiftSimulator.prototype.getObject = function(method, url, data) {
    return this.findObjectOr404(url, function (container, object) {
        return [200, object.content, object.headers];
    });
};

SwiftSimulator.prototype.postObject = function(method, url, data, headers) {
    return this.findObjectOr404(url, function (container, object) {
        var editableHeaders = [
            'content-type',
            'content-encoding',
            'content-disposition',
            'x-delete-at'
        ];
        var newHeaders = {};

        // Copy all non-editable headers unchanged
        angular.forEach(object.headers, function (value, name) {
            name = name.toLowerCase();
            if (editableHeaders.indexOf(name) == -1) {
                newHeaders[name] = value;
            } else if (name == 'content-type') {
                // The Content-Type header is always present
                newHeaders[name] = value;
            }
        });

        // Set the editable headers that was submitted with the POST
        angular.forEach(headers, function (value, name) {
            name = name.toLowerCase();
            if (editableHeaders.indexOf(name) > -1 && value) {
                newHeaders[name] = value;
            } else if (name.indexOf('x-object-meta-') == 0) {
                newHeaders[name] = value;
            }
        });

        var d = new Date();
        // Convert from local timezone to UTC timezone
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        newHeaders['Last-Modified'] = d.toUTCString();
        object.headers = newHeaders;
        return [202, null];
    });
};

SwiftSimulator.prototype.putObject = function(method, url, data) {
    return this.findContainerOr404(url, function (cont, contName, objName) {
        var lastModified = data.lastModifiedDate || new Date();
        var object = {headers: {'Last-Modified': lastModified.toISOString()}};

        if (angular.isString(data)) {
            object.content = data;
            object.headers.ETag = SparkMD5.hash(data);
            object.headers['Content-Length'] = data.length;
            object.headers['Content-Type'] = 'text/plain';
        } else {
            object.headers['Content-Length'] = data.size;
            object.headers['Content-Type'] = data.type;
            var reader = new FileReader();
            reader.onload = function () {
                object.content = reader.result;
                object.headers.ETag = SparkMD5.hash(reader.result);
            };
            reader.readAsText(data);
        }
        cont.objects[objName] = object;
        return [201, null];
    });
};

SwiftSimulator.prototype.addContainer = function(name) {
    this.data[name] = {objects: {}};
};

SwiftSimulator.prototype.setObjects = function(container, objects) {
    if (!this.data[container]) {
        this.addContainer(container);
    }
    angular.forEach(objects, function (object, name) {
        if (object.content) {
            object.headers.ETag = SparkMD5.hash(object.content);
            object.headers['Content-Length'] = object.content.length;
        } else {
            object.content = '';
        }
    });
    this.data[container].objects = objects;
};

angular.module('swiftBrowserE2E', ['ngMockE2E'])
    .service('swiftSim', SwiftSimulator);
