/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events (Hebei)
 * Student      : Xinliang Wang  (24832805)
 *
 * adminside/js/edit.js  -  EditCtrl  (edit.html)
 * ---------------------------------------------------------------------
 * The UPDATE half of C.R.U.D., plus the registrations of that event.
 *
 * Two things worth pointing out when this page is demonstrated:
 *
 *   1. It calls GET /api/admin/events/:id (not /api/events/:id) because
 *      an event that is suspended or already past must still be editable.
 *   2. It sends a PARTIAL update with PUT - only the fields the form
 *      holds are transmitted, which is why the API builds its SET clause
 *      from whatever keys arrive (see routes/events.js).
 *
 * The registration list at the bottom shows who has booked, newest first,
 * and lets staff remove one. Removing the last registration is what makes
 * a previously blocked DELETE succeed - the integrity rule can therefore
 * be demonstrated end to end from this page.
 * ===================================================================== */

(function () {
    'use strict';

    angular.module('adminApp')
        .controller('EditCtrl', ['$q', '$window', 'Params', 'Api', 'Util', 'Feedback',
            function ($q, $window, Params, Api, Util, Feedback) {

            var vm = this;

            vm.eventId       = Number(Params().id) || 0;
            vm.loading       = true;
            vm.error         = null;
            vm.saving        = false;
            vm.event         = null;
            vm.categories    = [];
            vm.organisations = [];
            vm.alerts        = [];
            vm.U             = Util;
            vm.feedback      = Feedback();

            /* ---- the form (filled once the event arrives) ------------ */
            vm.form = {};

            function fillForm(event) {
                vm.form = {
                    event_name:       event.name,
                    summary:          event.summary,
                    full_description: event.description || '',
                    category_id:      event.category.category_id,
                    organisation_id:  event.organisation.organisation_id,
                    event_date:       Util.inputDateTime(event.event_date),
                    end_date:         Util.inputDateTime(event.end_date),
                    venue:            event.venue,
                    address:          event.address,
                    suburb:           event.suburb,
                    city:             event.city,
                    ticket_price:     event.ticket_price,
                    is_free:          event.is_free,
                    goal_amount:      event.goal.target_amount,
                    capacity:         event.capacity,
                    seats_taken:      event.seats_taken,
                    featured:         event.featured,
                    status:           event.status
                };
            }

            /* ---- validation ------------------------------------------ */
            function validate() {
                vm.alerts = [];
                var f = vm.form;

                if (!f.event_name || f.event_name.trim().length < 3) {
                    vm.alerts.push('Event name is required (at least 3 characters).');
                }
                if (!f.summary)       vm.alerts.push('A short summary is required.');
                if (!f.category_id)   vm.alerts.push('Please choose a category.');
                if (!f.organisation_id) vm.alerts.push('Please choose an organisation.');
                if (!f.event_date)    vm.alerts.push('Event date is required.');
                if (!f.venue)         vm.alerts.push('Venue is required.');
                if (!f.suburb)        vm.alerts.push('Suburb / district is required.');
                if (!f.city)          vm.alerts.push('City is required.');
                if (Number(f.ticket_price) < 0) vm.alerts.push('Ticket price cannot be negative.');
                if (!Number.isInteger(Number(f.capacity)) || Number(f.capacity) <= 0) {
                    vm.alerts.push('Capacity must be a whole number greater than zero.');
                }
                if (Number(f.seats_taken) > Number(f.capacity)) {
                    vm.alerts.push('Seats taken cannot be larger than capacity.');
                }
                return vm.alerts.length === 0;
            }

            /* ---- save (PUT) ------------------------------------------ */
            /* The date inputs hold real Date objects (AngularJS requires it
             * for datetime-local); turn them back into MySQL DATETIME text
             * before the request leaves the browser. */
            function payload() {
                var p = angular.copy(vm.form);
                p.event_date = Util.apiDateTime(p.event_date);
                p.end_date   = Util.apiDateTime(p.end_date);
                if (!p.end_date) delete p.end_date;   // partial PUT: leave it alone
                return p;
            }

            vm.save = function () {
                if (!validate()) return;

                vm.saving = true;
                vm.alerts = [];

                Api.updateEvent(vm.eventId, payload())
                    .then(function (updated) {
                        vm.saving = false;
                        vm.event  = updated;
                        fillForm(updated);
                        vm.feedback.ok('Event "' + updated.name + '" was updated.');
                    })
                    .catch(function (err) {
                        vm.saving = false;
                        vm.alerts = [err.message];
                    });
            };

            /* ---- remove one registration ----------------------------- */
            vm.removeRegistration = function (registration) {
                if (!$window.confirm('Remove the registration made by ' +
                                     registration.full_name + '?')) return;

                Api.removeRegistration(registration.registration_id)
                    .then(function () {
                        // reload so both the table and the seat counter refresh
                        return Api.event(vm.eventId);
                    })
                    .then(function (event) {
                        vm.event = event;
                        vm.feedback.flash('Registration removed. The event now has ' +
                                          event.registrations.length + ' registration(s).', 'success');
                    })
                    .catch(function (err) {
                        vm.feedback.flash(err.message, 'error');
                    });
            };

            /* ---- load ------------------------------------------------ */
            function load() {
                if (!vm.eventId) {
                    vm.loading = false;
                    vm.error   = 'No event id was supplied. Open this page as edit.html?id=3';
                    return;
                }

                $q.all({
                    event:         Api.event(vm.eventId),
                    categories:    Api.categories(),
                    organisations: Api.organisations()
                }).then(function (result) {
                    vm.event         = result.event;
                    vm.categories    = result.categories;
                    vm.organisations = result.organisations;
                    fillForm(result.event);
                    vm.loading = false;
                }).catch(function (err) {
                    vm.loading = false;
                    vm.error   = err.message;
                });
            }

            load();
        }]);
})();
