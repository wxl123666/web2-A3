/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events (Hebei)
 * Student      : Xinliang Wang  (24832805)
 *
 * routes/stats.js  -  GET /api/stats
 * ---------------------------------------------------------------------
 * One small aggregate request that powers the animated counters on the
 * home page AND the tiles at the top of the admin dashboard. Doing the
 * maths in MySQL keeps a single query on the wire instead of shipping
 * every row to the browser.
 *
 * NEW IN A3: registration totals, now that people can book tickets.
 * ===================================================================== */

'use strict';

const express = require('express');
const { query } = require('../event_db');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const row = await query(
            `SELECT
                (SELECT COUNT(*) FROM events WHERE status='active' AND event_date >= CURDATE())
                    AS upcoming_events,
                (SELECT COUNT(*) FROM events WHERE status='active' AND event_date <  CURDATE())
                    AS past_events,
                (SELECT COUNT(*) FROM events WHERE status='suspended')
                    AS suspended_events,
                (SELECT COUNT(*) FROM event_categories) AS categories,
                (SELECT COUNT(*) FROM charity_organisations) AS organisations,
                (SELECT COALESCE(SUM(raised_amount),0) FROM goals) AS total_raised,
                (SELECT COALESCE(SUM(seats_taken),0) FROM events WHERE status='active')
                    AS total_participants,
                -- registration figures (Assessment 3)
                (SELECT COUNT(*) FROM registrations) AS total_registrations,
                (SELECT COALESCE(SUM(tickets),0) FROM registrations) AS total_tickets
                `
        );

        const r = row[0];
        res.json({
            success: true,
            data: {
                upcoming_events:    Number(r.upcoming_events),
                past_events:        Number(r.past_events),
                suspended_events:   Number(r.suspended_events),
                categories:         Number(r.categories),
                organisations:      Number(r.organisations),
                total_raised:       Number(r.total_raised),
                total_participants: Number(r.total_participants),
                total_registrations: Number(r.total_registrations),
                total_tickets:      Number(r.total_tickets)
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
