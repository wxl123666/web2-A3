/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events
 * Student      : Xinliang Wang  (24832805)
 *
 * routes/organisations.js  -  GET /api/organisations
 * ---------------------------------------------------------------------
 * The home page "Our partner charities" section is fed from here.
 * ===================================================================== */

'use strict';

const express = require('express');
const { query, queryOne } = require('../event_db');

const router = express.Router();

/* GET /api/organisations */
router.get('/', async (req, res, next) => {
    try {
        const rows = await query(
            `SELECT o.organisation_id,
                    o.name,
                    o.abn,
                    o.mission,
                    o.contact_email,
                    o.phone,
                    o.website,
                    o.logo_emoji,
                    COUNT(e.event_id) AS event_count
               FROM charity_organisations o
               LEFT JOIN events e
                      ON e.organisation_id = o.organisation_id
                     AND e.status = 'active'
              GROUP BY o.organisation_id, o.name, o.abn, o.mission,
                       o.contact_email, o.phone, o.website, o.logo_emoji
              ORDER BY o.name`
        );

        res.json({
            success: true,
            count:   rows.length,
            data:    rows.map((r) => ({
                organisation_id: r.organisation_id,
                name:            r.name,
                abn:             r.abn,
                mission:         r.mission,
                contact_email:   r.contact_email,
                phone:           r.phone,
                website:         r.website,
                logo:            r.logo_emoji,
                event_count:     Number(r.event_count)
            }))
        });
    } catch (err) {
        next(err);
    }
});

/* GET /api/organisations/:id */
router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Organisation id must be a positive whole number.'
            });
        }

        const row = await queryOne(
            `SELECT organisation_id, name, abn, mission, about,
                    contact_email, phone, website, logo_emoji
               FROM charity_organisations
              WHERE organisation_id = ?`,
            [id]
        );

        if (!row) {
            return res.status(404).json({
                success: false,
                message: `No organisation found with id ${id}.`
            });
        }

        res.json({ success: true, data: row });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
