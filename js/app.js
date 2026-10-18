/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events (Hebei)
 * Student      : Xinliang Wang  (24832805)
 *
 * clientside/js/app.js  -  the AngularJS module + shared services
 * ---------------------------------------------------------------------
 * This file is loaded by EVERY page of the client-side site. It creates
 * the single AngularJS application ("charityApp") and exposes two
 * services that the page controllers inject:
 *
 *   Api   - wraps $http so a controller never sees raw HTTP plumbing.
 *           Every method returns a PROMISE, which is why the brief's
 *           "NodeJS, HTML, JavaScript, DOM, Promises" requirement is met:
 *           controllers call .then(...) for the happy path and
 *           .catch(...) for the error path.
 *   Util  - pure formatting helpers (dates, money, countdowns) so the
 *           templates stay readable.
 *
 * Using services (instead of copying fetch code into each controller) is
 * what keeps the four pages consistent: one place talks to the API, four
 * places render the result.
 * ===================================================================== */

(function () {
    'use strict';

    /* -----------------------------------------------------------------
     * 1. The application module
     * -------------------------------------------------------------- */
    var app = angular.module('charityApp', []);

    app.constant('API_BASE', window.APP_CONFIG.API_BASE_URL);

    /* -----------------------------------------------------------------
     * 2. Api service - the only code that knows about HTTP
     * -------------------------------------------------------------- */
    app.factory('Api', ['$http', '$q', 'API_BASE', function ($http, $q, API_BASE) {

        /**
         * Every endpoint of this project answers with the same envelope:
         *      { success: true,  count: n, data: ... }
         *      { success: false, message: "..." }
         * `unwrap` throws the message as an Error when success is false,
         * so a single .catch() in the controller can show any problem.
         */
        function unwrap(response) {
            var body = response.data;
            if (body && body.success === false) {
                var err = new Error(body.message || 'The request failed.');
                err.status = response.status;
                throw err;
            }
            return body ? body.data : null;
        }

        /**
         * $http rejects on any non-2xx status and hands over the raw
         * response object, which has no `.message`. Without this the UI
         * would print "undefined" instead of the API's own explanation
         * (for example "you are already registered for this event"),
         * so every request is normalised into a real Error here.
         */
        function normalise(response) {
            var body = response.data;
            var message = (body && body.message)
                ? body.message
                : (response.status <= 0
                    ? 'Could not reach the API at ' + API_BASE + '. Is it running?'
                    : 'The request failed (HTTP ' + response.status + ').');
            var err = new Error(message);
            err.status = response.status;
            err.body   = body;
            return $q.reject(err);
        }

        function get(path, params) {
            return $http.get(API_BASE + path, { params: params || {} })
                        .then(unwrap, normalise);
        }

        function post(path, payload) {
            return $http.post(API_BASE + path, payload)
                        .then(unwrap, normalise);
        }

        function put(path, payload) {
            return $http.put(API_BASE + path, payload)
                        .then(unwrap, normalise);
        }

        function remove(path) {
            return $http.delete(API_BASE + path)
                        .then(unwrap, normalise);
        }

        return {
            /* ---- reading ------------------------------------------- */
            events:        function (params) { return get('/events', params); },
            search:        function (params) { return get('/events/search', params); },
            event:         function (id)     { return get('/events/' + id); },
            similar:       function (id)     { return get('/events/' + id + '/similar'); },
            categories:    function ()       { return get('/categories'); },
            organisations: function ()       { return get('/organisations'); },
            stats:         function ()       { return get('/stats'); },
            registrations: function (eventId){ return get('/registrations', { event_id: eventId }); },

            /* ---- writing (new in Assessment 3) --------------------- */
            register:      function (payload){ return post('/registrations', payload); }
        };
    }]);

    /* -----------------------------------------------------------------
     * 3. Util service - formatting helpers used inside the templates
     * -------------------------------------------------------------- */
    app.factory('Util', function () {

        var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var DAYS   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday',
                      'Thursday', 'Friday', 'Saturday'];

        /* `instanceof Date` is false for a Date created in another JS
         * realm, so the type is read from the internal class tag. */
        function isDateLike(value) {
            return Object.prototype.toString.call(value) === '[object Date]';
        }

        /** 'YYYY-MM-DD HH:mm:ss' -> Date (MySQL sends a plain string). */
        function toDate(value) {
            if (!value) return null;
            if (isDateLike(value)) return value;
            var normalised = String(value).replace(' ', 'T');
            var d = new Date(normalised);
            return isNaN(d.getTime()) ? null : d;
        }

        return {
            toDate: toDate,

            /** "Sat 25 Oct" */
            shortDate: function (value) {
                var d = toDate(value);
                if (!d) return '';
                return DAYS[d.getDay()].slice(0, 3) + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
            },

            /** "Sat 25 October 2026" */
            longDate: function (value) {
                var d = toDate(value);
                if (!d) return '';
                var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                              'August', 'September', 'October', 'November', 'December'];
                return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' +
                       months[d.getMonth()] + ' ' + d.getFullYear();
            },

            /** "18:30" */
            time: function (value) {
                var d = toDate(value);
                if (!d) return '';
                return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
            },

            /** "2026-10-12 18:31" - used in the registrations table */
            dateTime: function (value) {
                var d = toDate(value);
                if (!d) return '';
                return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                       ('0' + d.getDate()).slice(-2) + ' ' +
                       ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
            },

            /** 1234 -> "1,234" */
            number: function (value) {
                return Number(value || 0).toLocaleString('en-AU');
            },

            /** 55 -> "$55.00" (0 -> "Free") */
            money: function (value) {
                var n = Number(value || 0);
                if (n === 0) return 'Free';
                return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2 });
            },

            /** Human countdown: "today", "in 6 days", "3 weeks ago" */
            countdown: function (days) {
                var d = Number(days);
                if (isNaN(d)) return '';
                if (d === 0)  return 'Today';
                if (d === 1)  return 'Tomorrow';
                if (d < 0) {
                    var past = Math.abs(d);
                    return past < 30 ? (past + ' days ago')
                                     : (Math.round(past / 30) + ' months ago');
                }
                if (d < 14) return 'In ' + d + ' days';
                if (d < 60) return 'In ' + Math.round(d / 7) + ' weeks';
                return 'In ' + Math.round(d / 30) + ' months';
            },

            /** Percent of a fundraising goal, clamped to 0..100 */
            percent: function (raised, target) {
                if (!target) return 0;
                return Math.min(100, Math.round((Number(raised) / Number(target)) * 100));
            },

            /** Turns a first name into initials for the avatar bubble */
            initials: function (name) {
                var parts = String(name || '?').trim().split(/\s+/);
                if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
            }
        };
    });

    /* -----------------------------------------------------------------
     * 3b. Params - reads the page's query string
     *     (event.html?id=3, register.html?event=3, search.html?category=2)
     *     $location.search() is not used because, in AngularJS's default
     *     hash-bang mode, a URL without a "#" is not parsed into
     *     parameters reliably. Reading window.location.search directly is
     *     simple and always correct.
     * -------------------------------------------------------------- */
    app.factory('Params', ['$window', function ($window) {
        return function () {
            var out = {};
            var query = ($window.location.search || '').replace(/^\?/, '');
            query.split('&').forEach(function (pair) {
                if (!pair) return;
                var eq = pair.indexOf('=');
                var key   = eq < 0 ? pair : pair.slice(0, eq);
                var value = eq < 0 ? ''   : pair.slice(eq + 1);
                out[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
            });
            return out;
        };
    }]);

    /* -----------------------------------------------------------------
     * 4. Small global helpers used by every controller
     *    (loading flags and error messages behave identically on all
     *     four pages, so they live here once)
     * -------------------------------------------------------------- */
    app.factory('PageState', function () {
        return function () {
            return {
                loading: true,
                error:   null,
                fail:    function (err) {
                    this.loading = false;
                    this.error = (err && err.message)
                        ? err.message
                        : 'Cannot reach the API. Please make sure the API server is running.';
                },
                done:    function () { this.loading = false; this.error = null; }
            };
        };
    });
})();
