/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events (Hebei)
 * Student      : Xinliang Wang  (24832805)
 *
 * adminside/js/dashboard.js  -  ListCtrl  (index.html)
 * ---------------------------------------------------------------------
 * The admin LIST page. Unlike the public site this listing shows EVERY
 * event - active, past and suspended - because staff need to be able to
 * see (and fix) things the public cannot. That is why it calls
 * /api/admin/events instead of /api/events.
 *
 * The Delete button is the interesting one:
 *   - it asks for confirmation first (destructive action);
 *   - it then calls DELETE /api/events/:id;
 *   - if the API answers 409 the event has registrations, and the API's
 *     message is shown to the staff member verbatim, so they know exactly
 *     why nothing was deleted and what to do instead.
 * ===================================================================== */

(function () {
    'use strict';

    angular.module('adminApp')
        .controller('ListCtrl', ['$window', 'Api', 'Util', 'Feedback',
            function ($window, Api, Util, Feedback) {

            var vm = this;

            vm.loading  = true;
            vm.error    = null;
            vm.events   = [];
            vm.stats    = null;
            vm.U        = Util;
            vm.feedback = Feedback();

            /* ---- filters (pure AngularJS, no re-request needed) ------ */
            vm.filter = { status: '', q: '' };

            vm.matches = function (event) {
                var statusOk = true;
                if (vm.filter.status === 'active')   statusOk = event.status === 'active';
                if (vm.filter.status === 'suspended') statusOk = event.status === 'suspended';
                if (vm.filter.status === 'upcoming')  statusOk = event.status === 'active' && event.time_status === 'upcoming';
                if (vm.filter.status === 'past')      statusOk = event.time_status === 'past';

                var textOk = true;
                if (vm.filter.q) {
                    var needle = vm.filter.q.toLowerCase();
                    textOk = (event.name + ' ' + event.venue + ' ' + event.city)
                                .toLowerCase().indexOf(needle) !== -1;
                }
                return statusOk && textOk;
            };

            /* ---- load ------------------------------------------------ */
            function load() {
                vm.loading = true;
                vm.error   = null;

                Api.list()
                    .then(function (data) {
                        vm.events  = data;
                        vm.loading = false;
                    })
                    .catch(function (err) {
                        vm.loading = false;
                        vm.error   = err.message;
                    });

                Api.stats()
                    .then(function (data) { vm.stats = data; })
                    .catch(function () { vm.stats = null; });
            }

            /* ---- delete ---------------------------------------------- */
            vm.remove = function (event) {
                var ok = $window.confirm(
                    'Delete "' + event.name + '"?\n\n' +
                    'This cannot be undone. Events that already have registrations ' +
                    'cannot be deleted.'
                );
                if (!ok) return;

                Api.deleteEvent(event.event_id)
                    .then(function (data) {
                        // remove it from the table without a second request
                        vm.events = vm.events.filter(function (e) {
                            return e.event_id !== event.event_id;
                        });
                        // `data` is undefined for DELETE (the API returns a
                        // message in the envelope), so build our own text.
                        vm.feedback.flash('"' + event.name + '" was deleted.', 'success');
                    })
                    .catch(function (err) {
                        // 409 = the event has registrations. Show the API's
                        // explanation so the rule is obvious to the user.
                        vm.feedback.flash(err.message, 'error');
                    });
            };

            load();
        }]);
})();
