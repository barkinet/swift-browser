/* extra stuff */

'use strict';

window.addEventListener('DOMContentLoaded', function () {
    angular.module('swiftBrowserE2E').run(function (swiftSim) {
        var text = [
            'Hey, this is some text. Have fun editing it!',
            '',
            '--Sincerely, the Swift Browser developers'
        ];
        var python = [
            'import math',
            '',
            'def primes(n):',
            '    """',
            '    Find all primes less than n.',
            '',
            '    >>> primes(3)',
            '    [2]',
            '    >>> primes(15)',
            '    [2, 3, 5, 7, 11, 13]',
            '    """',
            '    candidates = [True] * n',
            '    candidates[0] = candidates[1] = False',
            '    stop = int(math.sqrt(n))',
            '    for i in range(2, stop + 1):',
            '        if candidates[i]:',
            '            for j in range(2 * i, n, i):',
            '                candidates[j] = False',
            '    return [i for (i, c) in enumerate(candidates) if c]',
            '',
            'print "Primes below 20:", ", ".join(map(str, primes(20)))'
        ];
        var html = [
            '<!DOCTYPE html>',
            '<html>',
            '  <head>',
            '    <meta charset="utf-8">',
            '    <title>Test Page</title>',
            '  </head>',
            '',
            '  <body>',
            '    <h1>Welcome!</h1>',
            '    <p><i>Pretty</i> <a href="other.html">cool</a>!</p>',
            '  </body>',
            '</html>'
        ];

        swiftSim.addContainer('empty container');
        swiftSim.setObjects('foo', {
            'x.txt': {headers: {
                'Last-Modified': 'Sat, 16 Aug 2014 13:33:21 GMT',
                'Content-Type': 'text/plain'
            }, content: text.join('\n')},
            'primes.py': {headers: {
                'Last-Modified': 'Sat, 16 Aug 2014 13:33:21 GMT',
                'Content-Type': 'text/x-python'
            }, content: python.join('\n')},
            'nested/z.html': {headers: {
                'Last-Modified': 'Sat, 16 Aug 2014 13:33:21 GMT',
                'Content-Type': 'text/html'
            }, content: html.join('\n')}
        });
    });
    angular.resumeBootstrap(['swiftBrowserE2E']);
});
