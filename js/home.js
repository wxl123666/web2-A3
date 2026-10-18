/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events (Hebei)
 * Student      : Xinliang Wang  (24832805)
 *
 * clientside/js/home.js  -  HomeCtrl  (index.html)
 * ---------------------------------------------------------------------
 * The home page is the busiest page of the site: it needs the headline
 * statistics, the categories, three lists of events and the partner
 * organisations.
 *
 * All five requests are fired at the same time with $q.all() instead of
 * one after another. That matters: five sequential round trips would take
 * five times as long, while the API (backed by a MySQL connection pool)
 * is happy to serve them in parallel.
 *
 * Every request returns a PROMISE; .then() renders the data and .catch()
 * fills the error banner. Nothing on this page is hard coded - if the API
 * is stopped the page shows the error banner and empty sections, which is
 * exactly what the demo video shows when the API is interrupted.
 * ===================================================================== */

(function () {
    'use strict';

    angular.module('charityApp')
        .controller('HomeCtrl', ['$scope', '$q', '$interval', 'Api', 'Util', 'PageState',
            function ($scope, $q, $interval, Api, Util, PageState) {

            var vm = this;

            /* ---- view model ----------------------------------------- */
            vm.state       = PageState();
            vm.stats       = null;
            vm.categories  = [];
            vm.upcoming    = [];
            vm.featured    = [];
            vm.past        = [];
            vm.organisations = [];
            vm.spot        = null;        // the rotating hero card
            vm.spotIndex   = 0;
            vm.U           = Util;        // expose the formatters to the template

            /* ---- helpers used by the template ----------------------- */
            vm.seatsLeft = function (event) {
                return Math.max(0, event.capacity - event.seats_taken);
            };

            /**
             * The hero card cycles through the four soonest events so the
             * page has some motion without the visitor doing anything.
             * $interval is AngularJS's wrapper around setInterval - it is
             * used instead of the raw browser function because AngularJS
             * then knows to run a digest cycle after every tick.
             */
            function startSpotlight() {
                var list = vm.upcoming.slice(0, 4);
                if (!list.length) return;

                vm.spot = list[0];
                vm.spotIndex = 0;

                $interval(function () {
                    vm.spotIndex = (vm.spotIndex + 1) % list.length;
                    vm.spot = list[vm.spotIndex];
                }, 5200);
            }

            /* ---- load everything ------------------------------------ */
            function load() {
                vm.state.loading = true;
                vm.state.error   = null;

                $q.all({
                    stats:         Api.stats(),
                    categories:    Api.categories(),
                    upcoming:      Api.events({ time: 'upcoming' }),
                    featured:      Api.events({ time: 'upcoming', featured: 1 }),
                    past:          Api.events({ time: 'past' }),
                    organisations: Api.organisations()
                }).then(function (result) {
                    vm.stats         = result.stats;
                    vm.categories    = result.categories;
                    vm.upcoming      = result.upcoming;
                    vm.featured      = result.featured;
                    vm.past          = result.past.slice(0, 3);
                    vm.organisations = result.organisations;
                    vm.state.done();
                    startSpotlight();
                }).catch(function (err) {
                    vm.state.fail(err);
                });
            }

            load();
        }]);
})();
