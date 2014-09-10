'use strict';

var SwiftSimulator = require('../swift-simulator.js');

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

describe('Container listing', function () {

    beforeEach(SwiftSimulator.loadAngularMocks);

    describe('should be sortable', function () {

        beforeEach(function () {
            SwiftSimulator.setContainers([
                {name: "bar", count: 20, bytes: 1234},
                {name: "foo", count: 10, bytes: 2345}
            ]);
            SwiftSimulator.commit();
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
            SwiftSimulator.setContainers([
                {name: "bar", count: 20, bytes: 1234},
                {name: "foo", count: 10, bytes: 2345}
            ]);
            SwiftSimulator.commit();
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
});


describe('Object listing', function () {

    beforeEach(SwiftSimulator.loadAngularMocks);

    describe('should be sortable', function () {

        beforeEach(function () {
            SwiftSimulator.setContainers([
                {name: "foo", count: 2, bytes: 20}
            ]);
            SwiftSimulator.setObjects('foo', [
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
            SwiftSimulator.commit();
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
        SwiftSimulator.setContainers([
            {name: "foo", count: 2, bytes: 20}
        ]);
        SwiftSimulator.setObjects('foo', [
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
        SwiftSimulator.commit();
        browser.get('index.html#/foo/');

        var names = by.css('td:nth-child(2)');
        expect(mapGetText(names)).toEqual(['dir/', 'x.txt']);
    });

    describe('selection', function () {

        beforeEach(function () {
            SwiftSimulator.setContainers([
                {name: "foo", count: 2, bytes: 20}
            ]);
            SwiftSimulator.setObjects('foo', [
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
            SwiftSimulator.commit();
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

});
