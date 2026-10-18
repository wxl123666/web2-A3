/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events (Hebei)
 * Student      : Xinliang Wang  (24832805)
 *
 * adminside/js/app.js  -  the AngularJS module for the ADMIN site
 * ---------------------------------------------------------------------
 * The admin site is a separate AngularJS application served from its own
 * folder (and its own zip). It talks to the same API, but it needs the
 * write operations the public site never uses:
 *
 *      GET    /api/admin/events     every event, any status
 *      GET    /api/admin/events/:id one event + its registrations
 *      POST   /api/events           create
 *      PUT    /api/events/:id       update
 *      DELETE /api/events/:id       delete (blocked when registrations exist)
 *      DELETE /api/registrations/:id remove a registration
 *      GET    /api/stats            dashboard tiles
 *      GET    /api/categories       dropdowns
 *      GET    /api/organisations    dropdowns
 *
 * Keeping the two sites separate is deliberate: the public site can never
 * accidentally issue a DELETE, and each one can be deployed and marked
 * independently.
 * ===================================================================== */

(function () {
    'use strict';

    var app = angular.module('adminApp', []);

    app.constant('API_BASE', window.APP_CONFIG.API_BASE_URL);

    /* -----------------------------------------------------------------
     * Api service - every HTTP call the admin site makes
     * -------------------------------------------------------------- */
    app.factory('Api', ['$http', '$q', 'API_BASE', function ($http, $q, API_BASE) {

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
         * $http rejects on any non-2xx status and passes the raw response
         * object, which has no `.message` - so without this the page would
         * print "undefined" instead of the API's own explanation. That
         * matters most for DELETE: the API answers 409 with
         * "Cannot delete ... because 4 registration(s) already exist",
         * and the brief requires that message to reach the staff member.
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
            return $http.get(API_BASE + path, { params: params || {} }).then(unwrap, normalise);
        }
        function post(path, payload) {
            return $http.post(API_BASE + path, payload).then(unwrap, normalise);
        }
        function put(path, payload) {
            return $http.put(API_BASE + path, payload).then(unwrap, normalise);
        }
        function remove(path) {
            return $http.delete(API_BASE + path).then(unwrap, normalise);
        }

        return {
            /* ---- dashboard ------------------------------------------ */
            stats:        function ()          { return get('/stats'); },
            list:         function (params)    { return get('/admin/events', params); },
            event:        function (id)        { return get('/admin/events/' + id); },

            /* ---- C.R.U.D. ------------------------------------------- */
            createEvent:  function (payload)   { return post('/events', payload); },
            updateEvent:  function (id, body)  { return put('/events/' + id, body); },
            deleteEvent:  function (id)        { return remove('/events/' + id); },

            /* ---- registrations -------------------------------------- */
            removeRegistration: function (id)  { return remove('/registrations/' + id); },

            /* ---- lookups for the forms ------------------------------ */
            categories:    function ()         { return get('/categories'); },
            organisations: function ()         { return get('/organisations'); }
        };
    }]);

    /* -----------------------------------------------------------------
     * Params - reads ?id=... from the query string (edit.html?id=3)
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
     * Util - the same formatting helpers the public site uses
     * -------------------------------------------------------------- */
    app.factory('Util', function () {
        var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        /* `instanceof Date` fails for a Date built in another JS realm, so
         * the type is detected from the internal class tag instead. */
        function isDateLike(value) {
            return Object.prototype.toString.call(value) === '[object Date]';
        }

        function toDate(value) {
            if (!value) return null;
            if (isDateLike(value)) return value;
            var d = new Date(String(value).replace(' ', 'T'));
            return isNaN(d.getTime()) ? null : d;
        }

        return {
            toDate: toDate,
            shortDate: function (value) {
                var d = toDate(value);
                return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : '';
            },
            dateTime: function (value) {
                var d = toDate(value);
                if (!d) return '';
                return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                       ('0' + d.getDate()).slice(-2) + ' ' +
                       ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
            },
            /** AngularJS binds <input type="datetime-local"> to a real Date
             *  object - hand it a string and it throws ngModel:datefmt -
             *  so this helper returns a Date rather than formatted text. */
            inputDateTime: function (value) {
                return toDate(value);
            },
            /** ...and this is the way back: Date -> 'YYYY-MM-DD HH:mm:ss',
             *  which is the format MySQL expects for a DATETIME column. */
            apiDateTime: function (value) {
                var d = toDate(value);
                if (!d) return null;
                return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                       ('0' + d.getDate()).slice(-2) + ' ' +
                       ('0' + d.getHours()).slice(-2) + ':' +
                       ('0' + d.getMinutes()).slice(-2) + ':00';
            },
            number: function (v) { return Number(v || 0).toLocaleString('en-AU'); },
            money:  function (v) {
                var n = Number(v || 0);
                return n === 0 ? 'Free' : '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2 });
            },
            initials: function (name) {
                var parts = String(name || '?').trim().split(/\s+/);
                if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
            }
        };
    });

    /* -----------------------------------------------------------------
     * Feedback - one shared banner + toast used by all three pages
     * -------------------------------------------------------------- */
    app.factory('Feedback', ['$timeout', function ($timeout) {
        return function () {
            return {
                message: null,
                kind:    'info',     // info | success | error
                ok:      function (msg) { this.kind = 'success'; this.message = msg; },
                bad:     function (msg) { this.kind = 'error';   this.message = msg; },
                info:    function (msg) { this.kind = 'info';    this.message = msg; },
                clear:   function ()    { this.message = null; },
                /** show `msg` for a moment then fade it out */
                flash:   function (msg, kind) {
                    var self = this;
                    self.kind = kind || 'info';
                    self.message = msg;
                    $timeout(function () { self.message = null; }, 6000);
                }
            };
        };
    }]);
})();
