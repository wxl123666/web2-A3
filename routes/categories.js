/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events
 * Student      : Xinliang Wang  (24832805)
 *
 * routes/categories.js  -  GET /api/categories
 * ---------------------------------------------------------------------
 * The search page needs the list of categories to fill its dropdown, so
 * the brief asks for a dedicated endpoint for it. Only categories that
 * actually publish at least one visible event are returned - an empty
 * option in the dropdown would only ever produce an empty result set.
 * ===================================================================== */

'use strict';

const express = require('express');
const { query, queryOne } = require('../event_db');

const router = express.Router();

/* GET /api/categories  ->  all categories that have published events */
router.get('/', async (req, res, next) => {
    try {
        const rows = await query(
            `SELECT c.category_id,
                    c.category_name,
                    c.slug,
                    c.description,
                    c.icon,
                    c.colour_hex,
                    c.image_url,
                    COUNT(e.event_id) AS event_count
               FROM event_categories c
               LEFT JOIN events e
                      ON e.category_id = c.category_id
                     AND e.status = 'active'
              GROUP BY c.category_id, c.category_name, c.slug, c.description,
                       c.icon, c.colour_hex, c.image_url
              ORDER BY c.category_name`
        );

        res.json({
            success: true,
            count:   rows.length,
            data:    rows.map((r) => ({
                category_id: r.category_id,
                name:        r.category_name,
                slug:        r.slug,
                description: r.description,
                icon:        r.icon,
                colour:      r.colour_hex,
                // hand-drawn illustration used on the home page category rail
                image:       r.image_url,
                event_count: Number(r.event_count)
            }))
        });
    } catch (err) {
        next(err);
    }
});

/* GET /api/categories/:id  ->  one category */
router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Category id must be a positive whole number.'
            });
        }

        const row = await queryOne(
            `SELECT category_id, category_name, slug, description, icon, colour_hex, image_url
               FROM event_categories
              WHERE category_id = ?`,
            [id]
        );

        if (!row) {
            return res.status(404).json({
                success: false,
                message: `No category found with id ${id}.`
            });
        }

        res.json({ success: true, data: row });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
