/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events (Hebei)
 * Student      : Xinliang Wang  (24832805)
 *
 * routes/registrations.js  -  /api/registrations
 * ---------------------------------------------------------------------
 *   GET  /api/registrations            every registration (admin use),
 *                                      newest purchase first
 *   GET  /api/registrations?event_id=3 registrations for one event
 *   POST /api/registrations            record a new registration
 *
 * The rules enforced here mirror the rules the database enforces, so a
 * mistake is caught early AND still cannot slip through if the API is
 * bypassed:
 *   1. the event must exist and must be active (suspended events cannot
 *      be booked - they are invisible on the public site anyway);
 *   2. one email may book the same event only once
 *      (registrations.uq_registration_event_email);
 *   3. tickets must be a whole number of at least 1;
 *   4. the seats must still be available.
 * ===================================================================== */

'use strict';

const express = require('express');
const { query, queryOne, run, transaction } = require('../event_db');

const router = express.Router();

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shape one registrations row for JSON output. */
function shapeRegistration(r) {
    return {
        registration_id:   r.registration_id,
        event_id:          r.event_id,
        full_name:         r.full_name,
        email:             r.email,
        phone:             r.phone,
        tickets:           r.tickets,
        registration_date: r.registration_date,
        note:              r.note
    };
}

/* =====================================================================
 * GET /api/registrations
 * =================================================================== */
router.get('/', async (req, res, next) => {
    try {
        const eventId = req.query.event_id;
        const where   = [];
        const params  = [];

        if (!isBlank(eventId)) {
            const id = Number(eventId);
            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'event_id must be a positive whole number.'
                });
            }
            where.push('r.event_id = ?');
            params.push(id);
        }

        // Newest purchase first - that is the order the brief asks the
        // event detail page to use, so the API already returns it sorted.
        const rows = await query(
            `SELECT r.registration_id, r.event_id, r.full_name, r.email, r.phone,
                    r.tickets, r.registration_date, r.note,
                    e.event_name
               FROM registrations r
               JOIN events e ON e.event_id = r.event_id
              ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
              ORDER BY r.registration_date DESC`,
            params
        );

        res.json({
            success: true,
            count:   rows.length,
            data:    rows.map((r) => {
                const shaped = shapeRegistration(r);
                shaped.event_name = r.event_name;
                return shaped;
            })
        });
    } catch (err) {
        next(err);
    }
});

/* =====================================================================
 * POST /api/registrations
 * Body (JSON): event_id, full_name, email, phone, tickets, note
 * Answers 201 + the saved record, which the registration page shows in
 * its confirmation panel.
 * =================================================================== */
router.post('/', async (req, res, next) => {
    try {
        const body = req.body || {};

        // ---- 1. event id ---------------------------------------------
        const eventId = Number(body.event_id);
        if (!Number.isInteger(eventId) || eventId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'A valid event id is required.'
            });
        }

        // ---- 2. user details -----------------------------------------
        if (isBlank(body.full_name) || String(body.full_name).trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Please enter your full name (at least 2 characters).'
            });
        }
        if (String(body.full_name).length > 120) {
            return res.status(400).json({
                success: false,
                message: 'Name is too long (maximum 120 characters).'
            });
        }

        const email = String(body.email || '').trim().toLowerCase();
        if (!EMAIL_RE.test(email) || email.length > 160) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address.'
            });
        }

        const phone = isBlank(body.phone) ? null : String(body.phone).trim().slice(0, 40);

        // ---- 3. tickets ----------------------------------------------
        const tickets = Number(body.tickets);
        if (!Number.isInteger(tickets) || tickets < 1) {
            return res.status(400).json({
                success: false,
                message: 'Number of tickets must be a whole number of at least 1.'
            });
        }
        if (tickets > 20) {
            return res.status(400).json({
                success: false,
                message: 'A single registration can book at most 20 tickets.'
            });
        }

        // ---- 4. the event must be bookable ---------------------------
        const event = await queryOne(
            `SELECT event_id, event_name, status, capacity, seats_taken, event_date
               FROM events
              WHERE event_id = ?`,
            [eventId]
        );

        if (!event) {
            return res.status(404).json({
                success: false,
                message: `No event found with id ${eventId}.`
            });
        }
        if (event.status !== 'active') {
            return res.status(409).json({
                success: false,
                message: `Registrations for "${event.event_name}" are closed.`
            });
        }

        // ---- 5. one registration per person per event ----------------
        const duplicate = await queryOne(
            'SELECT registration_id FROM registrations WHERE event_id = ? AND email = ?',
            [eventId, email]
        );
        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: 'This email address is already registered for this event. ' +
                         'Each person can register once per event.'
            });
        }

        // ---- 6. seats must still be free -----------------------------
        const seatsLeft = Number(event.capacity) - Number(event.seats_taken);
        if (tickets > seatsLeft) {
            return res.status(409).json({
                success: false,
                message: seatsLeft > 0
                    ? `Only ${seatsLeft} seat(s) left for "${event.event_name}".`
                    : `Sorry - "${event.event_name}" is fully booked.`
            });
        }

        // ---- 7. save it ----------------------------------------------
        // A transaction keeps the registration row and the seat counter in
        // step: either both happen or neither does.
        const result = await transaction(async (conn) => {
            const [ins] = await conn.execute(
                `INSERT INTO registrations
                   (event_id, full_name, email, phone, tickets, registration_date, note)
                 VALUES (?,?,?,?,?,NOW(),?)`,
                [
                    eventId,
                    String(body.full_name).trim(),
                    email,
                    phone,
                    tickets,
                    isBlank(body.note) ? null : String(body.note).trim().slice(0, 255)
                ]
            );

            await conn.execute(
                `UPDATE events
                    SET seats_taken = LEAST(capacity, seats_taken + ?)
                  WHERE event_id = ?`,
                [tickets, eventId]
            );

            return ins.insertId;
        });

        const saved = await queryOne(
            `SELECT registration_id, event_id, full_name, email, phone,
                    tickets, registration_date, note
               FROM registrations
              WHERE registration_id = ?`,
            [result]
        );

        res.status(201).json({
            success: true,
            message: `Thank you ${saved.full_name} - your registration for ` +
                     `"${event.event_name}" was recorded (${saved.tickets} ticket(s)).`,
            data:    shapeRegistration(saved)
        });
    } catch (err) {
        // MySQL error 1062 = duplicate key. Reached only in the unlikely
        // race where two identical requests land at the same instant.
        if (err && err.errno === 1062) {
            return res.status(409).json({
                success: false,
                message: 'This email address is already registered for this event.'
            });
        }
        next(err);
    }
});

/* =====================================================================
 * DELETE /api/registrations/:id
 * Not required by the brief, but it lets the admin site clear a
 * registration so that a blocked delete can then succeed - which is a
 * neat way to demonstrate the integrity rule in the demo video.
 * =================================================================== */
router.delete('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Registration id must be a positive whole number.'
            });
        }

        const reg = await queryOne(
            'SELECT registration_id, event_id, tickets FROM registrations WHERE registration_id = ?',
            [id]
        );
        if (!reg) {
            return res.status(404).json({
                success: false,
                message: `No registration found with id ${id}.`
            });
        }

        await transaction(async (conn) => {
            await conn.execute(
                'UPDATE events SET seats_taken = GREATEST(0, seats_taken - ?) WHERE event_id = ?',
                [reg.tickets, reg.event_id]
            );
            await conn.execute('DELETE FROM registrations WHERE registration_id = ?', [id]);
        });

        res.json({ success: true, message: `Registration ${id} was removed.` });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
