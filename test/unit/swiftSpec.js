'use strict';


describe('Swift LiteAuth authentication', function() {
    var credentials = {
        authUrl: '/auth/url',
        authUser: 'user',
        authKey: 'key'
    };

    beforeEach(module('swiftBrowser.swift'));
    beforeEach(inject(function ($httpBackend, $swift) {
        $httpBackend.whenGET('config.json').respond(404);
        this.$httpBackend = $httpBackend;
        this.$swift = $swift;
    }));
    afterEach(function () {
        this.$httpBackend.verifyNoOutstandingExpectation();
    });

    it('should not be logged in', function() {
        expect(this.$swift._headers).toEqual({});
    });

    describe('when logging in', function () {
        it('should send X-Auth-User and X-Auth-Key', function() {
            function check(headers) {
                return (headers['X-Auth-User'] == 'user' &&
                        headers['X-Auth-Key'] == 'key');
            }

            this.$httpBackend.expectGET('/auth/url', check)
                .respond(200);
            this.$swift.auth('liteauth', credentials);
        });

        it('should set X-Auth-Token', function() {
            var headers = {'X-Auth-Token': 'a token',
                           'X-Storage-Url': 'http://swift'};

            this.$httpBackend.expectGET('/auth/url')
                .respond(200, null, headers);
            this.$swift.auth('liteauth', credentials);
            this.$httpBackend.flush();

            expect(this.$swift._headers['X-Auth-Token']).toEqual('a token');
            expect(this.$swift._swiftUrl).toEqual('http://swift');
        });
    });

    it('should send X-Auth-Token with requests', function() {
        var headers = {'X-Auth-Token': 'a token',
                       'X-Storage-Url': 'http://swift'};

        function check(headers) {
            return headers['X-Auth-Token'] == 'a token';
        }

        this.$httpBackend.expectGET('/auth/url')
            .respond(200, null, headers);
        this.$swift.auth('liteauth', credentials);
        this.$httpBackend.flush();

        this.$httpBackend.expectGET('http://swift', check)
            .respond(200, []);
        this.$swift.listContainers();
    });
});

describe('Swift Keystone authentication', function() {
    var credentials = {
        authUrl: '/tokens',
        authTenant: 'tenant',
        authUsername: 'user',
        authPassword: 'pass'
    };

    beforeEach(module('swiftBrowser.swift'));
    beforeEach(inject(function ($httpBackend, $swift) {
        this.$httpBackend = $httpBackend;
        this.$swift = $swift;
    }));
    afterEach(function () {
        this.$httpBackend.verifyNoOutstandingExpectation();
    });

    describe('when logging in', function () {
        var loginResponse = {
            access: {
                token: {id: 'a token'},
                serviceCatalog: [
                    {name: 'swift',
                     endpoints: [{publicURL: 'http://swift'}]}
                ]
            }
        };

        it('should POST tenant, username, and password', function() {
            var loginRequest = {auth: {
                tenantName: 'tenant',
                passwordCredentials: {
                    username: 'user',
                    password: 'pass'
                }
            }};
            this.$httpBackend.expectPOST('/tokens', loginRequest)
                .respond(200, loginResponse);
            this.$swift.auth('keystone', credentials);
        });

        it('should set X-Auth-Token', function() {
            this.$httpBackend.expectPOST('/tokens')
                .respond(200, loginResponse);
            this.$swift.auth('keystone', credentials);
            this.$httpBackend.flush();

            expect(this.$swift._headers['X-Auth-Token']).toEqual('a token');
            expect(this.$swift._swiftUrl).toEqual('http://swift');
        });
    });
});


describe('Swift request types', function() {
    beforeEach(module('swiftBrowser.swift'));
    beforeEach(inject(function ($httpBackend, $swift) {
        this.$httpBackend = $httpBackend;
        this.$swift = $swift;
    }));
    afterEach(function () {
        this.$httpBackend.verifyNoOutstandingExpectation();
    });

    it('should send GET request when listing objects', function() {
        this.$httpBackend.expectGET('/v1/AUTH_abc/cont')
            .respond(200, []);
        this.$swift.listObjects('cont');
        this.$httpBackend.flush();
    });

    it('should send HEAD request when getting metadata', function() {
        this.$httpBackend.expect('HEAD', '/v1/AUTH_abc/cont/foo/bar')
            .respond(202, null);
        this.$swift.headObject('cont', 'foo/bar');
        this.$httpBackend.flush();
    });

    it('should send POST request when setting metadata', function() {
        this.$httpBackend.expect('POST', '/v1/AUTH_abc/cont/foo/bar')
            .respond(202, null);
        var headers = {'Content-Type': 'text/plain'};
        this.$swift.postObject('cont', 'foo/bar', headers);
        this.$httpBackend.flush();
    });

    it('should send DELETE request when deleting an objct', function() {
        this.$httpBackend.expectDELETE('/v1/AUTH_abc/cont/foo/bar')
            .respond(204, null);
        this.$swift.deleteObject('cont', 'foo/bar');
        this.$httpBackend.flush();
    });

    it('should send PUT request when uploading an objct', function() {
        this.$httpBackend.expectPUT('/v1/AUTH_abc/cont/foo/bar')
            .respond(201, null);
        this.$swift.uploadObject('cont', 'foo/bar', 'data');
        this.$httpBackend.flush();
    });
});

describe('headObject', function () {
    beforeEach(module('swiftBrowser.swift'));
    beforeEach(inject(function ($httpBackend, $swift) {
        this.$httpBackend = $httpBackend;
        this.$swift = $swift;
    }));
    afterEach(function () {
        this.$httpBackend.verifyNoOutstandingExpectation();
    });

    it('should not transform response', function () {
        this.$httpBackend.expect('HEAD', '/v1/AUTH_abc/cont/foo')
            .respond(202, 'not really JSON',
                     {'Content-Type': 'application/json'});

        var req = this.$swift.headObject('cont', 'foo');
        req.success(function (data, status, headers, config) {
            expect(config.transformResponse).toEqual([]);
        });
        this.$httpBackend.flush();
    });
});

describe('getObject', function () {
    beforeEach(module('swiftBrowser.swift'));
    beforeEach(inject(function ($httpBackend, $swift) {
        this.$httpBackend = $httpBackend;
        this.$swift = $swift;
    }));
    afterEach(function () {
        this.$httpBackend.verifyNoOutstandingExpectation();
    });

    it('should not transform response', function () {
        this.$httpBackend.expect('GET', '/v1/AUTH_abc/cont/foo')
            .respond(202, 'not really JSON',
                     {'Content-Type': 'application/json'});

        var req = this.$swift.getObject('cont', 'foo');
        req.success(function (data, status, headers, config) {
            expect(data).toEqual('not really JSON');
            expect(config.transformResponse).toEqual([]);
        });
        this.$httpBackend.flush();
    });
});

describe('postObject', function () {
    beforeEach(module('swiftBrowser.swift'));
    beforeEach(inject(function ($httpBackend, $swift) {
        this.$httpBackend = $httpBackend;
        this.$swift = $swift;
    }));
    afterEach(function () {
        this.$httpBackend.verifyNoOutstandingExpectation();
    });

    it('should send custom headers', function () {
        var headers = {'Content-Type': 'text/plain',
                       'X-Foo': 'some value'};
        function check(allHeaders) {
            return (allHeaders['Content-Type'] == 'text/plain' &&
                    allHeaders['X-Foo'] == 'some value');
        }
        this.$httpBackend.expect('POST', '/v1/AUTH_abc/cont/foo', null, check)
            .respond(202, null);
        this.$swift.postObject('cont', 'foo', headers);
        this.$httpBackend.flush();
    });

    it('should merge in $swift headers', function () {
        function check(allHeaders) {
            return allHeaders['X-Auth-Token'] == 'a token';
        }
        this.$httpBackend.expect('POST', '/v1/AUTH_abc/cont/foo', null, check)
            .respond(202, null);
        this.$swift._headers['X-Auth-Token'] = 'a token';
        this.$swift.postObject('cont', 'foo', {});
        this.$httpBackend.flush();
    });

    it('should not send a default Content-Type header', function () {
        function check(allHeaders) {
            var names = Object.keys(allHeaders);
            return names.some(function (name) {
                return name.toLowerCase() == 'content-type';
            });
        }
        this.$httpBackend.expect('POST', '/v1/AUTH_abc/cont/foo', null, check)
            .respond(202, null);
        this.$swift.postObject('cont', 'foo', {});
    });
});

describe('copyObject', function () {
    beforeEach(module('swiftBrowser.swift'));
    beforeEach(inject(function ($httpBackend, $swift) {
        this.$httpBackend = $httpBackend;
        this.$swift = $swift;
    }));
    afterEach(function () {
        this.$httpBackend.verifyNoOutstandingExpectation();
    });

    it('should set Destination header', function () {
        function check(headers) {
            return headers.destination == 'y/bar';
        }
        this.$httpBackend.expect('COPY', '/v1/AUTH_abc/x/foo', null, check)
            .respond(202, null);
        this.$swift.copyObject('x', 'foo', 'y', 'bar');
        this.$httpBackend.flush();
    });

    it('should not add a Content-Type header', function () {
        function check(headers) {
            var names = Object.keys(headers);
            return names.every(function (name) {
                return name.toLowerCase() != 'content-type';
            });
        }
        this.$httpBackend.expect('COPY', '/v1/AUTH_abc/x/foo', null, check)
            .respond(202, null);
        this.$swift.copyObject('x', 'foo', 'y', 'bar');
    });
});

describe('uploadObject', function () {
    beforeEach(module('swiftBrowser.swift'));
    beforeEach(inject(function ($httpBackend, $swift) {
        this.$httpBackend = $httpBackend;
        this.$swift = $swift;
    }));
    afterEach(function () {
        this.$httpBackend.verifyNoOutstandingExpectation();
    });

    it('should send custom headers', function () {
        var headers = {'Content-Type': 'text/plain',
                       'X-Foo': 'some value'};
        function check(allHeaders) {
            return (allHeaders['Content-Type'] == 'text/plain' &&
                    allHeaders['X-Foo'] == 'some value');
        }
        this.$httpBackend.expect('PUT', '/v1/AUTH_abc/cont/foo', null, check)
            .respond(201, null);
        this.$swift.uploadObject('cont', 'foo', null, headers);
        this.$httpBackend.flush();
    });

    it('should send strings as Blobs', function () {
        function checkType(data) {
            return data instanceof Blob;
        }
        this.$httpBackend.expect('PUT', '/v1/AUTH_abc/cont/foo', checkType)
            .respond(201, null);
        this.$swift.uploadObject('cont', 'foo', 'string data');
        this.$httpBackend.flush();
    });

    it('should send correct data', function (done) {
        var blob;
        function save(data) {
            blob = data;
            return true;
        }
        this.$httpBackend.expect('PUT', '/v1/AUTH_abc/cont/foo', save)
            .respond(201, null);
        this.$swift.uploadObject('cont', 'foo', 'string data');
        this.$httpBackend.flush();

        var reader = new FileReader();
        reader.onload = function () {
            expect(this.result).toEqual('string data');
            done();
        };
        reader.readAsText(blob);
    });
});

describe('deleteContainer', function () {
    beforeEach(module('swiftBrowser.swift'));
    beforeEach(inject(function ($httpBackend, $swift) {
        this.$httpBackend = $httpBackend;
        this.$swift = $swift;
    }));
    afterEach(function () {
        this.$httpBackend.verifyNoOutstandingExpectation();
    });

    it('should send delete objects first', function() {
        var objects = [{name: 'foo'}, {name: 'nested/bar'}];
        this.$httpBackend.expectGET('/v1/AUTH_abc/cont?prefix=')
            .respond(200, objects);
        this.$httpBackend.expectDELETE('/v1/AUTH_abc/cont/foo')
            .respond(204, null);
        this.$httpBackend.expectDELETE('/v1/AUTH_abc/cont/nested/bar')
            .respond(204, null);
        this.$httpBackend.expectDELETE('/v1/AUTH_abc/cont')
            .respond(204, null);
        this.$swift.deleteContainer('cont');
        this.$httpBackend.flush();
    });
});
