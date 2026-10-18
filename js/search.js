/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events (Hebei)
 * Student      : Xinliang Wang  (24832805)
 *
 * clientside/js/search.js  -  SearchCtrl  (search.html)
 * ---------------------------------------------------------------------
 * The search page is the page the brief asks to be filterable by
 * DATE, LOCATION and CATEGORY - each one on its own and all three
 * together.
 *
 * Two-way data binding is what makes this page short: the three inputs
 * are bound to vm.criteria with ng-model, so calling Api.search() always
 * sends whatever the visitor currently sees. There is no
 * document.getElementById(...).value anywhere.
 *
 * "Clear filters" simply resets the model and re-runs the search; the
 * URL is kept in sync so a filtered result can be bookmarked or shared.
 * ===================================================================== */

(function () {
    'use strict';

    angular.module('charityApp')
        .controller('SearchCtrl', ['$scope', '$window', 'Params', 'Api', 'Util', 'PageState',
            function ($scope, $window, Params, Api, Util, PageState) {

            var vm = this;

            vm.state       = PageState();
            vm.categories  = [];
            vm.results     = [];
            vm.searched    = false;
            vm.U           = Util;

            /* ---- the filter model (bound with ng-model) -------------- */
            vm.criteria = {
                date:      '',
                location:  '',
                category:  '',
                max_price: '',
                free:      false
            };

            /* ---- deep links: search.html?category=2 ------------------ */
            var params = Params();
            if (params.category) vm.criteria.category = String(params.category);
            if (params.date)     vm.criteria.date     = String(params.date);
            if (params.location) vm.criteria.location = String(params.location);

            vm.seatsLeft = function (event) {
                return Math.max(0, event.capacity - event.seats_taken);
            };

            /** Builds the query object the API expects from the model. */
            function buildQuery() {
                var q = {};
                if (vm.criteria.date)      q.date      = vm.criteria.date;
                if (vm.criteria.location)  q.location  = vm.criteria.location;
                if (vm.criteria.category)  q.category  = vm.criteria.category;
                if (vm.criteria.max_price !== '' && vm.criteria.max_price !== null) {
                    q.max_price = vm.criteria.max_price;
                }
                if (vm.criteria.free)      q.free      = 1;
                return q;
            }

            /** True when at least one criterion was supplied. */
            vm.hasCriteria = function () {
                return !!(vm.criteria.date || vm.criteria.location ||
                          vm.criteria.category || vm.criteria.free ||
                          (vm.criteria.max_price !== '' && vm.criteria.max_price !== null));
            };

            vm.search = function () {
                vm.state.loading = true;
                vm.state.error   = null;
                vm.searched      = true;

                var query = buildQuery();

                // keep the address bar shareable (plain History API -
                // no AngularJS routing is involved on this page)
                var qs = Object.keys(buildQuery()).map(function (k) {
                    return encodeURIComponent(k) + '=' + encodeURIComponent(query[k]);
                }).join('&');
                $window.history.replaceState({}, '', qs ? ('?' + qs) : 'search.html');

                Api.search(query)
                    .then(function (data) {
                        vm.results = data;
                        vm.state.done();
                    })
                    .catch(function (err) {
                        vm.results = [];
                        vm.state.fail(err);
                    });
            };

            vm.clear = function () {
                vm.criteria = { date: '', location: '', category: '', max_price: '', free: false };
                vm.search();
            };

            /* ---- categories for the dropdown + first results ---------- */
            Api.categories()
                .then(function (data) { vm.categories = data; })
                .catch(function () { vm.categories = []; });

            vm.search();
        }]);
})();
