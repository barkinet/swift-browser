'use strict';

var SwiftMock = require('../swift-mock.js');
var path = require('path');
var tmp = require('tmp');
var Q = require('q');

var mktemp = Q.nfbind(tmp.file);

describe('my app', function() {

  browser.get('index.html');

  it('should redirect to /#/ when fragment is empty', function() {
    expect(browser.getLocationAbsUrl()).toMatch("#/");
  });

});


function mapGetText(locator) {
    return element.all(locator).map(function (el) {
        return el.getText();
    });
}

function mapIsSelected(locator) {
    return element.all(locator).map(function (el) {
        return el.isSelected();
    });
}

function uploadFile(path) {
    browser.executeScript(function () {
        $('#file-1').removeClass('hidden');
    }).then(function () {
        $('#file-1').sendKeys(path);
    });
}

describe('Container listing', function () {

    beforeEach(SwiftMock.loadAngularMocks);

    describe('should be sortable', function () {

        beforeEach(function () {
            SwiftMock.setContainers([
                {name: "bar", count: 20, bytes: 1234},
                {name: "foo", count: 10, bytes: 2345}
            ]);
            browser.get('index.html#/');
        });

        it('by name', function () {
            var rows = by.repeater('container in containers');
            var names = rows.column('{{ container.name }}');

            // Initial sort order is by name
            expect(mapGetText(names)).toEqual(['bar', 'foo']);
            // Clicking the name header sorts reverses the order
            element(by.css('th:nth-child(2)')).click();
            expect(mapGetText(names)).toEqual(['foo', 'bar']);
        });

        it('by size', function () {
            var sizes = by.css('td:nth-child(3)');

            // Initial sort
            expect(mapGetText(sizes)).toEqual(['1.2 KB', '2.3 KB']);
            // Sorting by size makes no change
            element.all(by.css('th')).get(2).click();
            expect(mapGetText(sizes)).toEqual(['1.2 KB', '2.3 KB']);
            // Clicking again reverses
            element.all(by.css('th')).get(2).click();
            expect(mapGetText(sizes)).toEqual(['2.3 KB', '1.2 KB']);
        });

        it('by count', function () {
            var rows = by.repeater('container in containers');
            var counts = rows.column('{{ container.count | number }}');

            // Initial sort order is by name
            expect(mapGetText(counts)).toEqual(['20 objects', '10 objects']);
            // Clicking the header sorts
            element.all(by.css('th')).get(3).click();
            expect(mapGetText(counts)).toEqual(['10 objects', '20 objects']);
            // Clicking the header sorts reverses the order
            element.all(by.css('th')).get(3).click();
            expect(mapGetText(counts)).toEqual(['20 objects', '10 objects']);
        });

    });

    describe('selection', function () {

        beforeEach(function () {
            SwiftMock.setContainers([
                {name: "bar", count: 20, bytes: 1234},
                {name: "foo", count: 10, bytes: 2345}
            ]);
            browser.get('index.html#/');
        });

        var toggle = by.css('th.toggle input');
        var checkboxes = by.css('td:nth-child(1) input');

        it('should be deselected by default', function () {
            expect(element(toggle).isSelected()).toBe(false);
            expect(mapIsSelected(checkboxes)).toEqual([false, false]);
        });

        it('should allow toggle all', function () {
            element(toggle).click();
            expect(mapIsSelected(checkboxes)).toEqual([true, true]);
        });

        it('should notice manually selecting all', function () {
            element.all(checkboxes).each(function (el) {
                el.click();
            });
            expect(element(toggle).isSelected()).toBe(true);
        });

    });

    describe('with no containers', function () {

        it('should not show all containers selected', function () {
            SwiftMock.setContainers([]);
            browser.get('index.html#/');

            var toggle = by.css('th.toggle input');
            expect(element(toggle).isSelected()).toBe(false);
        });
    });
});


describe('Object listing', function () {

    beforeEach(SwiftMock.loadAngularMocks);

    describe('should be sortable', function () {

        beforeEach(function () {
            SwiftMock.setContainers([
                {name: "foo", count: 2, bytes: 20}
            ]);
            SwiftMock.setObjects('foo', [
                {hash: "401b30e3b8b5d629635a5c613cdb7919",
                 'last_modified': "2014-08-16T13:33:21.848400",
                 bytes: 20,
                 name: "x.txt",
                 'content_type': "text/plain"},
                {hash: "009520053b00386d1173f3988c55d192",
                 'last_modified': "2014-08-16T13:33:21.848400",
                 bytes: 10,
                 name: "y.txt",
                 'content_type': "text/plain"}
            ]);
            browser.get('index.html#/foo/');
        });

        it('by name', function () {
            var rows = by.repeater('item in items');
            var names = rows.column('{{ item.title }}');

            // Initial sort order is by name
            expect(mapGetText(names)).toEqual(['x.txt', 'y.txt']);
            // Clicking the name header sorts reverses the order
            element.all(by.css('th')).get(1).click();
            expect(mapGetText(names)).toEqual(['y.txt', 'x.txt']);
        });

        it('by size', function () {
            var sizes = by.css('td:last-child');

            // Initial sort order is by name
            expect(mapGetText(sizes)).toEqual(['20.0 B', '10.0 B']);
            // Clicking the header sorts
            element(by.css('th:last-child')).click();
            expect(mapGetText(sizes)).toEqual(['10.0 B', '20.0 B']);
        });

    });

    it('should understand pseudo-directories', function () {
        SwiftMock.setContainers([
            {name: "foo", count: 2, bytes: 20}
        ]);
        SwiftMock.setObjects('foo', [
            {hash: "401b30e3b8b5d629635a5c613cdb7919",
             'last_modified': "2014-08-16T13:33:21.848400",
             bytes: 10,
             name: "x.txt",
             'content_type': "text/plain"},
            {hash: "009520053b00386d1173f3988c55d192",
             'last_modified': "2014-08-16T13:33:21.848400",
             bytes: 10,
             name: "dir/y.txt",
             'content_type': "text/plain"}
        ]);
        browser.get('index.html#/foo/');

        var names = by.css('td:nth-child(2)');
        expect(mapGetText(names)).toEqual(['dir/', 'x.txt']);
    });

    it('should understand deep pseudo-directories', function () {
        SwiftMock.setContainers([
            {name: "foo", count: 3, bytes: 30}
        ]);
        SwiftMock.setObjects('foo', [
            {hash: "401b30e3b8b5d629635a5c613cdb7919",
             'last_modified': "2014-08-16T13:33:21.848400",
             bytes: 13,
             name: "x.txt",
             'content_type': "text/plain"},
            {hash: "009520053b00386d1173f3988c55d192",
             'last_modified': "2014-08-16T13:33:21.848400",
             bytes: 10,
             name: "deeply/y.txt",
             'content_type': "text/plain"},
            {hash: "009520053b00386d1173f3988c55d192",
             'last_modified': "2014-08-16T13:33:21.848400",
             bytes: 10,
             name: "deeply/nested/z.txt",
             'content_type': "text/plain"}
        ]);
        browser.get('index.html#/foo/');

        var links = by.css('td:nth-child(2) a');
        expect(mapGetText(links)).toEqual(['deeply/', 'x.txt']);
        element.all(links).first().click();

        expect(mapGetText(links)).toEqual(['nested/', 'y.txt']);
        element.all(links).first().click();

        expect(mapGetText(links)).toEqual(['z.txt']);
    });

    describe('selection', function () {

        beforeEach(function () {
            SwiftMock.setContainers([
                {name: "foo", count: 2, bytes: 20}
            ]);
            SwiftMock.setObjects('foo', [
                {hash: "401b30e3b8b5d629635a5c613cdb7919",
                 'last_modified': "2014-08-16T13:33:21.848400",
                 bytes: 20,
                 name: "x.txt",
                 'content_type': "text/plain"},
                {hash: "009520053b00386d1173f3988c55d192",
                 'last_modified': "2014-08-16T13:33:21.848400",
                 bytes: 10,
                 name: "y.txt",
                 'content_type': "text/plain"}
            ]);
            browser.get('index.html#/foo/');
        });

        var toggle = by.css('th.toggle input');
        var checkboxes = by.css('td:nth-child(1) input');

        it('should be deselected by default', function () {
            expect(element(toggle).isSelected()).toBe(false);
            expect(mapIsSelected(checkboxes)).toEqual([false, false]);
        });

        it('should allow toggle all', function () {
            element(toggle).click();
            expect(mapIsSelected(checkboxes)).toEqual([true, true]);
        });

        it('should notice manually selecting all', function () {
            element.all(checkboxes).each(function (el) {
                el.click();
            });
            expect(element(toggle).isSelected()).toBe(true);
        });
    });

    describe('with no objects', function () {

        it('should not show all objects selected', function () {
            SwiftMock.setContainers([
                {name: "foo", count: 0, bytes: 0}
            ]);
            browser.get('index.html#/foo/');

            var toggle = by.css('th.toggle input');
            expect(element(toggle).isSelected()).toBe(false);
        });
    });

    it('should allow deletion', function () {
        SwiftMock.setContainers([
            {name: "foo", count: 2, bytes: 20}
        ]);
        SwiftMock.setObjects('foo', [
            {hash: "401b30e3b8b5d629635a5c613cdb7919",
             'last_modified': "2014-08-16T13:33:21.848400",
             bytes: 20,
             name: "x.txt",
             'content_type': "text/plain"},
            {hash: "009520053b00386d1173f3988c55d192",
             'last_modified': "2014-08-16T13:33:21.848400",
             bytes: 10,
             name: "y.txt",
             'content_type': "text/plain"},
            {hash: "009520053b00386d1173f3988c55d192",
             'last_modified': "2014-08-16T13:33:21.848400",
             bytes: 10,
             name: "z.txt",
             'content_type': "text/plain"}
        ]);
        browser.get('index.html#/foo/');
        var names = by.css('td:nth-child(2)');
        var checkboxes = by.css('td:nth-child(1) input');
        var deleteBtn = $('.btn[ng-click="delete()"]');

        element.all(checkboxes).get(0).click();
        element.all(checkboxes).get(2).click();

        deleteBtn.click();

        var modalNames = by.css('div.modal td:nth-child(2)');
        var modalCheckboxes = by.css('div.modal td:nth-child(1) input');
        var modalTitle = $('div.modal h3');
        var closeBtn = $('div.modal .btn[ng-click="$close()"]');

        expect(modalTitle.getText()).toMatch('Deleting 2 objects');
        expect(mapGetText(modalNames)).toEqual(['x.txt', 'z.txt']);
        expect(mapIsSelected(modalCheckboxes)).toEqual([true, true]);

        $('div.modal th:nth-child(1) input').click();
        expect(mapIsSelected(modalCheckboxes)).toEqual([false, false]);
        expect(closeBtn.isEnabled()).toBe(false);

        element.all(modalCheckboxes).last().click();
        expect(modalTitle.getText()).toMatch('Deleting 1 objects');

        closeBtn.click();
        expect(modalTitle.isPresent()).toBe(false);

        expect(mapIsSelected(checkboxes)).toEqual([true, false]);
        expect(mapGetText(names)).toEqual(['x.txt', 'y.txt']);
    });

    it('should allow deleting pseudo-directories', function () {
        SwiftMock.setContainers([
            {name: "foo", count: 3, bytes: 40}
        ]);
        SwiftMock.setObjects('foo', [
            {hash: "401b30e3b8b5d629635a5c613cdb7919",
             'last_modified': "2014-08-16T13:33:21.848400",
             bytes: 20,
             name: "x.txt",
             'content_type': "text/plain"},
            {hash: "009520053b00386d1173f3988c55d192",
             'last_modified': "2014-08-16T13:33:21.848400",
             bytes: 10,
             name: "bar/y.txt",
             'content_type': "text/plain"},
            {hash: "009520053b00386d1173f3988c55d192",
             'last_modified': "2014-08-16T13:33:21.848400",
             bytes: 10,
             name: "bar/z.txt",
             'content_type': "text/plain"}
        ]);
        browser.get('index.html#/foo/');

        var names = by.css('td:nth-child(2)');
        var modalNames = by.css('div.modal td:nth-child(2)');
        var deleteBtn = $('.btn[ng-click="delete()"]');
        var closeBtn = $('div.modal .btn[ng-click="$close()"]');

        $$('td:nth-child(1) input').first().click();
        deleteBtn.click();
        expect(mapGetText(modalNames)).toEqual(['bar/']);

        closeBtn.click();
        expect(mapGetText(names)).toEqual(['x.txt']);
    });

    it('should allow uploading files', function () {
        SwiftMock.setContainers([
            {name: "foo", count: 1, bytes: 20}
        ]);
        SwiftMock.setObjects('foo', [
            {hash: "401b30e3b8b5d629635a5c613cdb7919",
             'last_modified': "2014-08-16T13:33:21.848400",
             bytes: 20,
             name: "nested/x.txt",
             'content_type': "text/plain"}
        ]);
        browser.get('index.html#/foo/nested/');

        var uploadBtn = $('.btn[ng-click="upload()"]');
        var names = by.css('td:nth-child(2)');
        expect(mapGetText(names)).toEqual(['x.txt']);

        uploadBtn.click();
        expect($('div.modal h3').getText()).toMatch('to foo/nested/');

        // Test with two paths where the first sort after the second
        var p1 = mktemp({prefix: 'b'});
        var p2 = mktemp({prefix: 'a'});
        Q.all([p1, p2]).spread(function (res1, res2) {
            var paths = [res1[0], res2[0]];
            paths.forEach(uploadFile);

            var uploadBtn = $('.btn[ng-click="uploadFiles()"]');
            var rows = by.repeater('file in files');
            var uploads = rows.column('{{ file.name }}');
            var newNames = paths.map(path.basename);
            expect(mapGetText(uploads)).toEqual(newNames);

            expect(uploadBtn.isEnabled()).toBe(true);
            uploadBtn.click();
            var progBar = $$('div.progress-bar').first();
            expect(progBar.getAttribute('aria-valuenow')).toBe('100');
            expect(uploadBtn.isEnabled()).toBe(false);

            $('.btn[ng-click="$dismiss()"]').click();
            expect($('div.modal h3').isPresent()).toBe(false);

            var expected = paths.map(path.basename);
            expected.push('x.txt');
            expected.sort();
            expect(mapGetText(names)).toEqual(expected);
        });
    });

    it('should allow unscheduling files for upload', function () {
        SwiftMock.setContainers([
            {name: "foo", count: 0, bytes: 0}
        ]);
        SwiftMock.setObjects('foo', []);
        browser.get('index.html#/foo/');

        var names = by.css('td:nth-child(2)');

        $('.btn[ng-click="upload()"]').click();

        Q.all([mktemp(), mktemp()]).spread(function (res1, res2) {
            var paths = [res1[0], res2[0]];
            var rows = by.repeater('file in files');
            var uploads = rows.column('{{ file.name }}');
            var base = path.basename(paths[1]);
            paths.forEach(uploadFile);

            // Remove the first file, expect that the second is still
            // there and that it's the only one.
            $$('a[ng-click="remove($index)"]').first().click();
            expect(mapGetText(uploads)).toEqual([base]);

            $('.btn[ng-click="uploadFiles()"]').click();
            $('.btn[ng-click="$dismiss()"]').click();
            expect(mapGetText(names)).toEqual([base]);
        });
    });

});

describe('Listing a pseudo-directory', function () {
    it('should add traling slash', function() {
        SwiftMock.loadAngularMocks();
        SwiftMock.setContainers([
            {name: "foo", count: 2, bytes: 20}
        ]);
        SwiftMock.setObjects('foo', [
            {hash: "401b30e3b8b5d629635a5c613cdb7919",
             'last_modified': "2014-08-16T13:33:21.848400",
             bytes: 20,
             name: "bar/baz.txt",
             'content_type': "text/plain"}
        ]);
        browser.get('index.html#/foo/bar');

        var url = browser.getLocationAbsUrl();
        expect(url).toMatch("index.html#/foo/bar/$");
    });
});

describe('Object metadata', function () {
    beforeEach(function () {
        SwiftMock.loadAngularMocks();
        SwiftMock.setContainers([
            {name: "foo", count: 1, bytes: 20}
        ]);
        SwiftMock.setObjects('foo', [
            {hash: "401b30e3b8b5d629635a5c613cdb7919",
             'last_modified': "2014-08-16T13:33:21.848400",
             bytes: 20,
             name: "bar/baz.txt",
             'content_type': "text/plain"}
        ]);
        browser.get('index.html#/foo/bar/baz.txt');
    });

    function td(rows, row, col) {
        col += 1; // css child selectors are 1-based
        return element(rows.row(row)).$('td:nth-child(' + col + ')');
    }
    function getText(el) {
        return el.getText();
    }
    function textInRow(rows, idx) {
        return element(rows.row(idx)).$$('td').map(getText);
    }

    it('should show metadata', function () {
        var rows = by.repeater('header in headers.sys');
        expect(element.all(rows).count()).toEqual(4);

        expect(textInRow(rows, 0)).toEqual([
            'etag', '401b30e3b8b5d629635a5c613cdb7919', ''
        ]);
        expect(textInRow(rows, 1)).toEqual([
            'last-modified', 'Sat, 16 Aug 2014 13:33:21 GMT', ''
        ]);
        expect(textInRow(rows, 2)).toEqual([
            'content-length', '20', ''
        ]);
        var input = td(rows, 3, 1).$('input');
        expect(td(rows, 3, 0).getText()).toEqual('content-type');
        expect(input.getAttribute('value')).toEqual('text/plain');
    });

    it('should allow editing metadata', function () {
        var rows = by.repeater('header in headers.sys');
        var contentType = td(rows, 3, 1).$('input');
        var saveBtn = $('.btn[ng-click="save()"]');

        expect(saveBtn.isEnabled()).toBe(false);
        contentType.clear();
        contentType.sendKeys('image/png');
        expect(saveBtn.isEnabled()).toBe(true);
        saveBtn.click();

        // Reload data from simulator
        $$('.breadcrumb a').last().click();
        $('td a').click();

        expect(contentType.getAttribute('value')).toEqual('image/png');
    });
});
