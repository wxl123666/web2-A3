/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events (Hebei)
 * Student      : Xinliang Wang  (24832805)
 *
 * routes/admin.js  -  /api/admin/*
 * ---------------------------------------------------------------------
 *   GET /api/admin/events       EVERY event - active, past AND suspended
 *   GET /api/admin/events/:id   one event of any status + its
 *                               registrations (used by the edit page)
 *
 * Why a separate /api/admin namespace instead of adding a query flag to
 * /api/events?
 *   * The public /api/events contract stays exactly as it was in A2, so
 *     the client-side site keeps working untouched.
 *   * "Read everything, including suspended rows" is an administrative
 *     privilege; giving it its own URL makes that privilege visible in
 *     the code and in the request log, and it is the natural place to
 *     add real authentication later (the brief says authentication is
 *     out of scope for A3).
 * The event objects returned are built with the SAME shapeEvent() used
 * by the public routes, so the admin tables can reuse the client's
 * rendering ideas without any extra mapping code.
 * ===================================================================== */

'use strict';

const express = require('express');
const { query, queryOne } = require('../event_db');

const eventsModule = require('./events');
const { shapeEvent, EVENT_FIELDS, EVENT_JOINS } = eventsModule;

const router = express.Router();

/* =====================================================================
 * GET /api/admin/events
 * ?status=active|suspended|past  optional filter
 * ?q=keyword                     optional search over the name/venue
 * No status is hidden here - that is the whole point of the admin list.
 * =================================================================== */
router.get('/events', async (req, res, next) => {
    try {
        const where  = [];
        const params = [];

        const status = (req.query.status || '').toLowerCase();
        if (status === 'active' || status === 'suspended') {
            where.push('e.status = ?');
            params.push(status);
        } else if (status === 'past') {
            where.push('e.event_date < CURDATE()');
        } else if (status === 'upcoming') {
            where.push("e.status = 'active' AND e.event_date >= CURDATE()");
        }

        const keyword = (req.query.q || '').trim();
        if (keyword) {
            where.push('(e.event_name LIKE ? OR e.venue LIKE ? OR e.city LIKE ?)');
            const like = `%${keyword}%`;
            params.push(like, like, like);
        }

        const rows = await query(
            `SELECT ${EVENT_FIELDS} ${EVENT_JOINS}
              ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
              ORDER BY e.event_date DESC`,
            params
        );

        res.json({
            success: true,
            count:   rows.length,
            data:    rows.map(shapeEvent)
        });
    } catch (err) {
        next(err);
    }
});

/* =====================================================================
 * GET /api/admin/events/:id
 * One event of ANY status, plus the registrations recorded against it.
 * The admin "update" page shows both together so the staff member can
 * see who has already booked before changing the date or the capacity.
 * =================================================================== */
router.get('/events/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Event id must be a positive whole number.'
            });
        }

        const row = await queryOne(
            `SELECT ${EVENT_FIELDS}, e.full_description
             ${EVENT_JOINS}
             WHERE e.event_id = ?`,
            [id]
        );

        if (!row) {
            return res.status(404).json({
                success: false,
                message: `No event found with id ${id}.`
            });
        }

        const event = shapeEvent(row);
        event.description = row.full_description;

        const registrations = await query(
            `SELECT registration_id, full_name, email, phone, tickets,
                    registration_date, note
               FROM registrations
              WHERE event_id = ?
              ORDER BY registration_date DESC`,
            [id]
        );

        event.registrations = registrations;

        res.json({ success: true, data: event });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
