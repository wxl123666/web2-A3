/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events (Hebei)
 * Student      : Xinliang Wang  (24832805)
 *
 * clientside/js/register.js  -  RegisterCtrl  (register.html)
 * ---------------------------------------------------------------------
 * NEW PAGE FOR ASSESSMENT 3. It does three things:
 *
 *   1. loads the chosen event from the API and shows it, so the visitor
 *      can see exactly what they are booking;
 *   2. collects the registration details in a form bound with ng-model
 *      (full name, email, phone, number of tickets, note);
 *   3. validates the input in the browser and, when it is valid, POSTs
 *      the record to  POST /api/registrations, then shows a confirmation.
 *
 * The event id arrives in the query string (register.html?event=3), which
 * is the technique the brief suggests. As a small extra, the id is also
 * remembered in localStorage, so a visitor who lands on the page without
 * a query string still gets the event they were last looking at.
 * ===================================================================== */

(function () {
    'use strict';

    angular.module('charityApp')
        .controller('RegisterCtrl', ['$scope', '$window', 'Params', 'Api', 'Util', 'PageState',
            function ($scope, $window, Params, Api, Util, PageState) {

            var vm = this;

            vm.state    = PageState();
            vm.event    = null;
            vm.sending  = false;
            vm.U        = Util;
            vm.alerts   = [];        // client-side validation messages
            vm.confirmation = null;  // filled in after a successful POST

            var params = Params();
            vm.eventId = Number(params.event) || Number($window.localStorage.getItem('lastEventId')) || 0;

            /* ---- the form model (bound with ng-model) ---------------- */
            vm.form = {
                full_name: '',
                email:     '',
                phone:     '',
                tickets:   1,
                note:      ''
            };

            vm.seatsLeft = function () {
                if (!vm.event) return 0;
                return Math.max(0, vm.event.capacity - vm.event.seats_taken);
            };

            vm.totalPrice = function () {
                if (!vm.event) return 0;
                return vm.event.ticket_price * (Number(vm.form.tickets) || 0);
            };

            /* ---- client-side validation ------------------------------ */
            var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            function validate() {
                vm.alerts = [];

                if (!vm.form.full_name || String(vm.form.full_name).trim().length < 2) {
                    vm.alerts.push('Please enter your full name (at least 2 characters).');
                }
                if (!EMAIL_RE.test(String(vm.form.email || '').trim())) {
                    vm.alerts.push('Please enter a valid email address, e.g. name@example.com');
                }
                var tickets = Number(vm.form.tickets);
                if (!Number.isInteger(tickets) || tickets < 1) {
                    vm.alerts.push('Number of tickets must be a whole number of at least 1.');
                } else if (tickets > 20) {
                    vm.alerts.push('You can book at most 20 tickets in one registration.');
                } else if (vm.event && tickets > vm.seatsLeft()) {
                    vm.alerts.push('Only ' + vm.seatsLeft() + ' place(s) are left for this event.');
                }
                if (vm.event && vm.event.time_status === 'past') {
                    vm.alerts.push('This event has already taken place and can no longer be booked.');
                }

                return vm.alerts.length === 0;
            }

            /* ---- submit ---------------------------------------------- */
            vm.submit = function () {
                // Step 1: validate in the browser. Fail -> alert, no request.
                if (!validate()) {
                    return;
                }

                vm.sending = true;

                // Step 2: call the API. The promise resolves with the saved
                // registration; .catch() shows whatever the server said
                // (for example "already registered for this event").
                Api.register({
                    event_id:  vm.eventId,
                    full_name: vm.form.full_name,
                    email:     String(vm.form.email).trim().toLowerCase(),
                    phone:     vm.form.phone || null,
                    tickets:   Number(vm.form.tickets),
                    note:      vm.form.note || null
                }).then(function (saved) {
                    vm.confirmation = {
                        registration_id: saved.registration_id,
                        name:            saved.full_name,
                        email:           saved.email,
                        tickets:         saved.tickets,
                        when:            saved.registration_date,
                        eventName:       vm.event ? vm.event.name : '',
                        total:           vm.totalPrice()
                    };
                    vm.sending = false;

                    // Refresh the event so the seat counter on this page and
                    // (later) on the detail page reflects the new booking.
                    return Api.event(vm.eventId);
                }).then(function (event) {
                    vm.event = event;
                }).catch(function (err) {
                    // Anything the server refuses (duplicate email, event
                    // full, event suspended...) goes into the page banner
                    // instead of the "please fix" list, because there is
                    // nothing wrong with the form itself.
                    vm.sending = false;
                    vm.alerts  = [];
                    vm.state.error = (err && err.message)
                        ? err.message
                        : 'The registration could not be saved.';
                });
            };

            vm.reset = function () {
                vm.confirmation = null;
                vm.alerts = [];
                vm.state.error = null;
                vm.form = { full_name: '', email: '', phone: '', tickets: 1, note: '' };
            };

            /* ---- load the event -------------------------------------- */
            function load() {
                if (!vm.eventId) {
                    vm.state.fail(new Error(
                        'No event was selected. Open this page from an event, e.g. register.html?event=3'));
                    return;
                }

                // remember it for the "no query string" case described above
                $window.localStorage.setItem('lastEventId', String(vm.eventId));

                vm.state.loading = true;
                Api.event(vm.eventId)
                    .then(function (data) {
                        vm.event = data;
                        vm.state.done();
                    })
                    .catch(function (err) {
                        vm.state.fail(err);
                    });
            }

            load();
        }]);
})();
