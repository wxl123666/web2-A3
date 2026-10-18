/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events (Hebei)
 * Student      : Xinliang Wang  (24832805)
 *
 * clientside/js/event.js  -  EventCtrl  (event.html)
 * ---------------------------------------------------------------------
 * The event detail page was built in Assessment 2. Assessment 3 adds:
 *
 *   1. the list of REGISTRATIONS for this event, sorted by the date the
 *      tickets were purchased, newest first. The sorting is done by the
 *      API (ORDER BY registration_date DESC) so the page just renders
 *      what it is given - the same rule therefore also applies to the
 *      admin site and to Postman.
 *   2. the "Register" button now links to the new registration page,
 *      passing the event id in the query string:
 *          register.html?event=3
 *      (a query string is used instead of a cookie so the page can be
 *       bookmarked and the back button keeps working).
 *
 * The id is read from the URL query string with the shared Params
 * service, so the page can be linked to and bookmarked.
 * ===================================================================== */

(function () {
    'use strict';

    angular.module('charityApp')
        .controller('EventCtrl', ['$scope', 'Params', 'Api', 'Util', 'PageState',
            function ($scope, Params, Api, Util, PageState) {

            var vm = this;

            vm.state   = PageState();
            vm.event   = null;
            vm.similar = [];
            vm.U       = Util;
            vm.eventId = Number(Params().id) || 0;

            /* ---- derived values used by the template ----------------- */
            vm.seatsLeft = function () {
                if (!vm.event) return 0;
                return Math.max(0, vm.event.capacity - vm.event.seats_taken);
            };

            vm.seatsPercent = function () {
                if (!vm.event || !vm.event.capacity) return 0;
                return Math.min(100, Math.round(vm.event.seats_taken / vm.event.capacity * 100));
            };

            vm.canRegister = function () {
                return vm.event && vm.event.time_status !== 'past' && vm.seatsLeft() > 0;
            };

            /* ---- load ------------------------------------------------ */
            function load() {
                if (!vm.eventId) {
                    vm.state.fail(new Error('No event id was supplied. Open this page as event.html?id=3'));
                    return;
                }

                vm.state.loading = true;

                Api.event(vm.eventId)
                    .then(function (data) {
                        vm.event = data;
                        vm.state.done();
                        // The registrations are already sorted newest-first
                        // by the API - see routes/events.js GET /:id.
                        return Api.similar(vm.eventId);
                    })
                    .then(function (similar) {
                        vm.similar = similar || [];
                    })
                    .catch(function (err) {
                        vm.state.fail(err);
                    });
            }

            load();
        }]);
})();
