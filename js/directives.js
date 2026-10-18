/* =====================================================================
 * PROG2002 A3 - client-side website (AngularJS)
 * directives.js  -  two small reusable AngularJS directives
 * ---------------------------------------------------------------------
 * A directive teaches HTML a new attribute. Writing one shows the
 * AngularJS idea of "declarative DOM": the template says WHAT should
 * happen ("count this number up"), not HOW.
 *
 *   <b count-up="1200" count-prefix="$"></b>
 *   <div reveal></div>
 * ===================================================================== */

(function () {
    'use strict';

    var app = angular.module('adminApp');

    /**
     * count-up
     * Animates 0 -> value the first time the element scrolls into view.
     * Used by the home page statistics and the admin dashboard tiles.
     */
    app.directive('countUp', ['$interval', function ($interval) {
        return {
            restrict: 'A',
            scope: { countUp: '=', countPrefix: '@', countSuffix: '@' },
            link: function (scope, element) {
                var target  = Number(scope.countUp) || 0;
                var prefix  = scope.countPrefix || '';
                var suffix  = scope.countSuffix || '';
                var started = false;

                function animate() {
                    if (started) return;
                    started = true;

                    var steps   = 40;
                    var current = 0;
                    var step    = target / steps;

                    var stop = $interval(function () {
                        current += step;
                        if (current >= target) {
                            element.text(prefix + Math.round(target).toLocaleString('en-AU') + suffix);
                            $interval.cancel(stop);
                            return;
                        }
                        element.text(prefix + Math.round(current).toLocaleString('en-AU') + suffix);
                    }, 32);
                }

                element.text(prefix + '0' + suffix);

                // Only start once the visitor can actually see the number.
                if (window.IntersectionObserver) {
                    var io = new IntersectionObserver(function (entries) {
                        entries.forEach(function (entry) {
                            if (entry.isIntersecting) {
                                animate();
                                io.unobserve(entry.target);
                            }
                        });
                    }, { threshold: 0.25 });
                    io.observe(element[0]);
                    // If the element is already visible (top of the page)
                    // IntersectionObserver fires immediately - nothing else to do.
                } else {
                    animate();
                }
            }
        };
    }]);

    /**
     * reveal
     * Adds the CSS class "in" when the element scrolls into view, which
     * triggers the fade-up animation defined in style.css.
     */
    app.directive('reveal', function () {
        return {
            restrict: 'A',
            link: function (scope, element) {
                element.addClass('reveal');
                if (!window.IntersectionObserver) {
                    element.addClass('in');
                    return;
                }
                var io = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            element.addClass('in');
                            io.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.12 });
                io.observe(element[0]);
            }
        };
    });
})();
