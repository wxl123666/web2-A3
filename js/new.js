/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events (Hebei)
 * Student      : Xinliang Wang  (24832805)
 *
 * adminside/js/new.js  -  NewCtrl  (new.html)
 * ---------------------------------------------------------------------
 * The CREATE half of C.R.U.D. It collects a brand new charity event and
 * POSTs it to /api/events.
 *
 * Validation happens twice on purpose:
 *   1. here, in the browser, so a staff member sees the problem instantly
 *      without a round trip (and no invalid request is ever sent);
 *   2. again inside the API (routes/events.js), because a client-side
 *      check can always be bypassed - the server must never trust it.
 * The messages are written so that either one can be shown as-is.
 * ===================================================================== */

(function () {
    'use strict';

    angular.module('adminApp')
        .controller('NewCtrl', ['$q', 'Api', 'Util', 'Feedback',
            function ($q, Api, Util, Feedback) {

            var vm = this;

            vm.categories    = [];
            vm.organisations = [];
            vm.sending       = false;
            vm.alerts        = [];
            vm.created       = null;
            vm.feedback      = Feedback();
            vm.loading       = true;

            /* ---- the empty form -------------------------------------- */
            vm.form = {
                event_name:       '',
                summary:          '',
                full_description: '',
                category_id:      '',
                organisation_id:  '',
                event_date:       '',
                end_date:         '',
                venue:            '',
                address:          '',
                suburb:           '',
                city:             'Shijiazhuang',
                ticket_price:     0,
                is_free:          true,
                goal_amount:      5000,
                capacity:         200,
                featured:         false
            };

            /** The brief's minimum: name, category, date, venue, place,
             *  price and capacity. Everything else may be left blank. */
            function validate() {
                vm.alerts = [];
                var f = vm.form;

                if (!f.event_name || f.event_name.trim().length < 3) {
                    vm.alerts.push('Event name is required (at least 3 characters).');
                }
                if (!f.summary) vm.alerts.push('A short summary is required.');
                if (!f.category_id) vm.alerts.push('Please choose a category.');
                if (!f.organisation_id) vm.alerts.push('Please choose an organisation.');
                if (!f.event_date) vm.alerts.push('Event date is required.');
                if (!f.venue) vm.alerts.push('Venue is required.');
                if (!f.suburb) vm.alerts.push('Suburb / district is required.');
                if (!f.city) vm.alerts.push('City is required.');
                if (f.ticket_price === '' || f.ticket_price === null || Number(f.ticket_price) < 0) {
                    vm.alerts.push('Ticket price must be zero or more.');
                }
                if (!Number.isInteger(Number(f.capacity)) || Number(f.capacity) <= 0) {
                    vm.alerts.push('Capacity must be a whole number greater than zero.');
                }
                return vm.alerts.length === 0;
            }

            vm.submit = function () {
                if (!validate()) return;

                vm.sending = true;
                vm.alerts  = [];

                // datetime-local gives us Date objects; the API wants text.
                var payload = angular.copy(vm.form);
                payload.event_date = Util.apiDateTime(payload.event_date);
                payload.end_date   = Util.apiDateTime(payload.end_date);
                if (!payload.end_date) delete payload.end_date;

                Api.createEvent(payload)
                    .then(function (created) {
                        vm.sending = false;
                        vm.created = created;
                        vm.feedback.ok('Event "' + created.name + '" was created (id ' +
                                       created.event_id + ').');
                    })
                    .catch(function (err) {
                        vm.sending = false;
                        // The API's message is written for humans, so show it.
                        vm.alerts = [err.message];
                    });
            };

            vm.reset = function () {
                vm.created = null;
                vm.alerts  = [];
                vm.feedback.clear();
                vm.form.event_name = '';
                vm.form.summary = '';
                vm.form.full_description = '';
            };

            /* ---- dropdown data --------------------------------------- */
            $q.all({
                categories:    Api.categories(),
                organisations: Api.organisations()
            }).then(function (result) {
                vm.categories    = result.categories;
                vm.organisations = result.organisations;
                vm.loading       = false;
            }).catch(function (err) {
                vm.loading = false;
                vm.feedback.bad('Could not load the dropdown data: ' + err.message);
            });
        }]);
})();
