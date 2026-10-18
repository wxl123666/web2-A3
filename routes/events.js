/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events (Hebei)
 * Student      : Xinliang Wang  (24832805)
 *
 * routes/events.js  -  every /api/events/* endpoint
 * ---------------------------------------------------------------------
 * Assessment 2 only needed to READ data; Assessment 3 closes the full
 * C.R.U.D. cycle so that the admin-side website can manipulate events:
 *
 *   GET    /api/events            list published events (home page)
 *   GET    /api/events/search     filter by date / location / category
 *   GET    /api/events/:id        one event + goal + organisation
 *                                 + its REGISTRATIONS (new in A3)
 *   GET    /api/events/:id/similar  other events in the same category
 *   POST   /api/events            create a charity event        (new)
 *   PUT    /api/events/:id        update an existing event      (new)
 *   DELETE /api/events/:id        delete an event - blocked if
 *                                 it already has registrations  (new)
 *
 * Design notes
 *   * Every write validates its input and answers 400 with a readable
 *     message before any SQL is executed - the browser shows that
 *     message verbatim on the admin site.
 *   * Values are always bound with ? placeholders (see event_db.js).
 *   * DELETE answers 409 Conflict when registrations exist, which is the
 *     honest REST status for "your request conflicts with the current
 *     state of the resource".
 * ===================================================================== */

'use strict';

const express = require('express');
const { query, queryOne, run } = require('../event_db');

const router = express.Router();

/* ---------------------------------------------------------------------
 * Shared SQL fragments
 * Keeping the SELECT in one place guarantees that the home page, the
 * search page, the detail page and the admin list all receive EXACTLY
 * the same shape of event object - so the AngularJS templates can be
 * reused without any reshaping on the client.
 * ------------------------------------------------------------------ */

const EVENT_FIELDS = `
    e.event_id,
    e.event_name,
    e.slug,
    e.summary,
    e.event_date,
    e.end_date,
    e.venue,
    e.address,
    e.suburb,
    e.city,
    e.ticket_price,
    e.is_free,
    e.goal_amount,
    e.capacity,
    e.seats_taken,
    e.image_url,
    e.cover_gradient,
    e.featured,
    e.status,
    e.suspension_reason,
    c.category_id,
    c.category_name,
    c.slug            AS category_slug,
    c.icon            AS category_icon,
    c.colour_hex      AS category_colour,
    o.organisation_id,
    o.name            AS organisation_name,
    o.logo_emoji      AS organisation_logo,
    o.mission         AS organisation_mission,
    o.contact_email   AS organisation_email,
    o.phone           AS organisation_phone,
    o.website         AS organisation_website,
    -- Business rule required by the brief: classify against today's date
    CASE WHEN e.event_date < CURDATE() THEN 'past' ELSE 'upcoming' END  AS time_status,
    DATEDIFF(DATE(e.event_date), CURDATE())                             AS days_until,
    -- Goal vs Progress (displayed as a bar on the detail page)
    g.goal_id,
    g.title           AS goal_title,
    g.target_amount   AS goal_target,
    g.raised_amount   AS goal_raised,
    g.unit_label      AS goal_unit,
    ROUND(CASE WHEN g.target_amount > 0
               THEN LEAST(100, (g.raised_amount / g.target_amount) * 100)
               ELSE 0 END, 1)                                           AS goal_percent,
    -- Popularity figures shown on the cards
    (SELECT COUNT(*) FROM donations d WHERE d.event_id = e.event_id)     AS donation_count,
    -- NEW IN A3: registration figures, so the client never has to make a
    -- second round trip just to show "12 people have registered".
    (SELECT COUNT(*)     FROM registrations r WHERE r.event_id = e.event_id) AS registration_count,
    (SELECT COALESCE(SUM(r.tickets),0) FROM registrations r WHERE r.event_id = e.event_id) AS tickets_booked
`;

const EVENT_JOINS = `
      FROM events e
      JOIN event_categories      c ON c.category_id      = e.category_id
      JOIN charity_organisations o ON o.organisation_id  = e.organisation_id
      LEFT JOIN goals            g ON g.event_id         = e.event_id
`;

/**
 * Turns a raw MySQL row into a tidy nested JSON object.
 * The database is relational (flat); the website prefers nested objects
 * ("event.category.name"), so the reshape happens here, once, on the
 * server. The AngularJS client never has to know about the join.
 */
function shapeEvent(row) {
    return {
        event_id:        row.event_id,
        name:            row.event_name,
        slug:            row.slug,
        summary:         row.summary,
        event_date:      row.event_date,
        end_date:        row.end_date,
        venue:           row.venue,
        address:         row.address,
        suburb:          row.suburb,
        city:            row.city,
        ticket_price:    Number(row.ticket_price),
        is_free:         Number(row.is_free) === 1,
        capacity:        row.capacity,
        seats_taken:     row.seats_taken,
        seats_left:      Math.max(0, row.capacity - row.seats_taken),
        image_url:       row.image_url,
        cover_gradient:  row.cover_gradient,
        featured:        Number(row.featured) === 1,
        status:          row.status,
        suspension_reason: row.suspension_reason,
        time_status:     row.time_status,
        days_until:      row.days_until,
        donation_count:  Number(row.donation_count || 0),
        registration_count: Number(row.registration_count || 0),
        tickets_booked:  Number(row.tickets_booked || 0),
        category: {
            category_id:   row.category_id,
            name:          row.category_name,
            slug:          row.category_slug,
            icon:          row.category_icon,
            colour:        row.category_colour
        },
        organisation: {
            organisation_id: row.organisation_id,
            name:            row.organisation_name,
            logo:            row.organisation_logo,
            mission:         row.organisation_mission,
            contact_email:   row.organisation_email,
            phone:           row.organisation_phone,
            website:         row.organisation_website
        },
        goal: {
            goal_id:       row.goal_id,
            title:         row.goal_title,
            target_amount: Number(row.goal_target || 0),
            raised_amount: Number(row.goal_raised || 0),
            unit_label:    row.goal_unit || 'dollars raised',
            percent:       Number(row.goal_percent || 0)
        }
    };
}

/* =====================================================================
 * GET /api/events
 * Home page listing (unchanged behaviour from A2).
 *   ?time=upcoming (default) | past | all     ?featured=1     ?limit=N
 * Suspended events are ALWAYS excluded from the public site.
 * =================================================================== */
router.get('/', async (req, res, next) => {
    try {
        const time   = (req.query.time || 'upcoming').toLowerCase();
        const where  = ["e.status = 'active'"];
        const params = [];

        if (time === 'upcoming') where.push('e.event_date >= CURDATE()');
        else if (time === 'past') where.push('e.event_date <  CURDATE()');
        else if (time !== 'all') {
            return res.status(400).json({
                success: false,
                message: "Invalid value for 'time'. Use upcoming, past or all."
            });
        }

        if (req.query.featured === '1' || req.query.featured === 'true') {
            where.push('e.featured = 1');
        }

        const order = time === 'past' ? 'e.event_date DESC' : 'e.event_date ASC';

        let limitSql = '';
        const limit = Number(req.query.limit);
        if (Number.isInteger(limit) && limit > 0) {
            limitSql = ' LIMIT ' + Math.min(limit, 50);
        }

        const rows = await query(
            `SELECT ${EVENT_FIELDS} ${EVENT_JOINS}
              WHERE ${where.join(' AND ')}
              ORDER BY ${order}${limitSql}`,
            params
        );

        res.json({
            success: true,
            count:   rows.length,
            filter:  { time },
            data:    rows.map(shapeEvent)
        });
    } catch (err) {
        next(err);
    }
});

/* =====================================================================
 * GET /api/events/search
 * The search page: date, location and category, in any combination.
 * =================================================================== */
router.get('/search', async (req, res, next) => {
    try {
        const where  = ["e.status = 'active'"];   // suspended never shown
        const params = [];

        // ---- 1. date -------------------------------------------------
        const date = req.query.date;
        if (date) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Please use YYYY-MM-DD.'
                });
            }
            where.push('DATE(e.event_date) >= ?');
            params.push(date);
        }

        const dateTo = req.query.date_to;
        if (dateTo) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date_to format. Please use YYYY-MM-DD.'
                });
            }
            where.push('DATE(e.event_date) <= ?');
            params.push(dateTo);
        }

        // ---- 2. location ---------------------------------------------
        const location = (req.query.location || '').trim();
        if (location) {
            if (location.length > 80) {
                return res.status(400).json({
                    success: false,
                    message: 'Location is too long (maximum 80 characters).'
                });
            }
            where.push('(e.suburb LIKE ? OR e.city LIKE ? OR e.venue LIKE ? OR e.address LIKE ?)');
            const like = `%${location}%`;
            params.push(like, like, like, like);
        }

        // ---- 3. category ----------------------------------------------
        const category = (req.query.category || '').trim();
        if (category) {
            if (/^\d+$/.test(category)) {
                where.push('e.category_id = ?');
                params.push(Number(category));
            } else {
                where.push('c.slug = ?');
                params.push(category);
            }
        }

        // ---- 4. optional extras ---------------------------------------
        const keyword = (req.query.q || '').trim();
        if (keyword) {
            where.push('(e.event_name LIKE ? OR e.summary LIKE ?)');
            const like = `%${keyword}%`;
            params.push(like, like);
        }

        const maxPrice = req.query.max_price;
        if (maxPrice !== undefined && maxPrice !== '') {
            const price = Number(maxPrice);
            if (Number.isNaN(price) || price < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'max_price must be a positive number.'
                });
            }
            where.push('e.ticket_price <= ?');
            params.push(price);
        }

        if (req.query.free === '1' || req.query.free === 'true') {
            where.push('e.is_free = 1');
        }

        // ---- 5. ordering ----------------------------------------------
        let order = 'e.event_date ASC';
        if (req.query.sort === 'price')      order = 'e.ticket_price ASC, e.event_date ASC';
        if (req.query.sort === 'price_desc') order = 'e.ticket_price DESC, e.event_date ASC';
        if (req.query.sort === 'name')       order = 'e.event_name ASC';

        const rows = await query(
            `SELECT ${EVENT_FIELDS} ${EVENT_JOINS}
              WHERE ${where.join(' AND ')}
              ORDER BY ${order}`,
            params
        );

        res.json({
            success: true,
            count:   rows.length,
            criteria: {
                date:      date     || null,
                date_to:   dateTo   || null,
                location:  location || null,
                category:  category || null,
                keyword:   keyword  || null,
                max_price: maxPrice || null
            },
            data: rows.map(shapeEvent)
        });
    } catch (err) {
        next(err);
    }
});

/* =====================================================================
 * GET /api/events/:id
 * IMPROVED IN A3: besides the event, its category, organisation, goal
 * and recent donations, it now also returns the complete list of
 * registrations recorded for this event, sorted by the date the tickets
 * were purchased - newest first, exactly as the brief asks.
 *
 * One extra query is used instead of a JOIN on purpose: a JOIN would
 * repeat every event column on every registration row, while the two
 * separate queries keep the payload small and the code readable.
 * =================================================================== */
router.get('/:id', async (req, res, next) => {
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
             WHERE e.event_id = ? AND e.status = 'active'`,
            [id]
        );

        if (!row) {
            return res.status(404).json({
                success: false,
                message: `No published event found with id ${id}.`
            });
        }

        const event = shapeEvent(row);
        event.description = row.full_description;

        // ---- registrations, latest purchase first --------------------
        const registrations = await query(
            `SELECT registration_id, full_name, email, phone, tickets,
                    registration_date, note
               FROM registrations
              WHERE event_id = ?
              ORDER BY registration_date DESC`,
            [id]
        );

        event.registrations = registrations.map((r) => ({
            registration_id:   r.registration_id,
            full_name:         r.full_name,
            email:             r.email,
            phone:             r.phone,
            tickets:           r.tickets,
            registration_date: r.registration_date,
            note:              r.note
        }));

        // ---- latest donations - the "wall of support" ----------------
        const donations = await query(
            `SELECT donor_name, amount, message, donated_at, is_anonymous
               FROM donations
              WHERE event_id = ?
              ORDER BY donated_at DESC
              LIMIT 5`,
            [id]
        );

        event.recent_donations = donations.map((d) => ({
            donor:      Number(d.is_anonymous) === 1 ? 'Anonymous' : d.donor_name,
            amount:     Number(d.amount),
            message:    d.message,
            donated_at: d.donated_at
        }));

        res.json({ success: true, data: event });
    } catch (err) {
        next(err);
    }
});

/* =====================================================================
 * GET /api/events/:id/similar
 * Up to three other upcoming events in the same category.
 * =================================================================== */
router.get('/:id/similar', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Event id must be a positive whole number.'
            });
        }

        let rows = await query(
            `SELECT ${EVENT_FIELDS} ${EVENT_JOINS}
              WHERE e.status = 'active'
                AND e.event_date >= CURDATE()
                AND e.category_id = (SELECT category_id FROM events WHERE event_id = ?)
                AND e.event_id <> ?
              ORDER BY e.event_date ASC
              LIMIT 3`,
            [id, id]
        );

        if (!rows.length) {
            rows = await query(
                `SELECT ${EVENT_FIELDS} ${EVENT_JOINS}
                  WHERE e.status = 'active'
                    AND e.event_date >= CURDATE()
                    AND e.event_id <> ?
                  ORDER BY e.event_date ASC
                  LIMIT 3`,
                [id]
            );
        }

        res.json({ success: true, count: rows.length, data: rows.map(shapeEvent) });
    } catch (err) {
        next(err);
    }
});

/* =====================================================================
 * ----------------------  WRITE OPERATIONS (A3)  ----------------------
 * ===================================================================== */

/**
 * Small validation helpers.
 * Each returns an English error message or null when the value is fine,
 * so the admin site can display the message straight to the user.
 */
const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';
const DATE_RE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/;

function slugify(text) {
    return String(text)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

/**
 * Shared field validator used by POST (all fields required) and by PUT
 * (only the fields that were actually sent are validated).
 * @returns {string|null} error message, or null when everything is valid
 */
function validateEventFields(body, { partial = false } = {}) {
    const has = (k) => !isBlank(body[k]);

    if (has('event_name') && String(body.event_name).length > 120) {
        return 'Event name must be 120 characters or fewer.';
    }
    if (!partial && isBlank(body.event_name)) return 'Event name is required.';

    if (!partial && isBlank(body.summary))  return 'A short summary is required.';
    if (has('summary') && String(body.summary).length > 255) {
        return 'Summary must be 255 characters or fewer.';
    }

    // ---- foreign keys must point at rows that really exist ----------
    if (!partial && isBlank(body.category_id))     return 'Category is required.';
    if (has('category_id') && !Number.isInteger(Number(body.category_id))) {
        return 'Category must be a valid category id.';
    }
    if (!partial && isBlank(body.organisation_id)) return 'Organisation is required.';
    if (has('organisation_id') && !Number.isInteger(Number(body.organisation_id))) {
        return 'Organisation must be a valid organisation id.';
    }

    // ---- date --------------------------------------------------------
    if (!partial && isBlank(body.event_date)) return 'Event date is required.';
    if (has('event_date') && !DATE_RE.test(String(body.event_date).trim())) {
        return 'Event date must look like YYYY-MM-DD or YYYY-MM-DD HH:MM.';
    }
    if (has('end_date') && !isBlank(body.end_date) && !DATE_RE.test(String(body.end_date).trim())) {
        return 'End date must look like YYYY-MM-DD or YYYY-MM-DD HH:MM.';
    }

    // ---- place -------------------------------------------------------
    if (!partial && isBlank(body.venue))   return 'Venue is required.';
    if (!partial && isBlank(body.suburb))  return 'Suburb / district is required.';
    if (!partial && isBlank(body.city))    return 'City is required.';

    // ---- numbers -----------------------------------------------------
    if (!partial && isBlank(body.ticket_price)) return 'Ticket price is required (use 0 for a free event).';
    if (has('ticket_price')) {
        const price = Number(body.ticket_price);
        if (Number.isNaN(price) || price < 0) return 'Ticket price must be zero or a positive number.';
    }
    if (!partial && isBlank(body.capacity)) return 'Capacity is required.';
    if (has('capacity')) {
        const cap = Number(body.capacity);
        if (!Number.isInteger(cap) || cap <= 0) return 'Capacity must be a whole number greater than zero.';
    }
    if (has('seats_taken')) {
        const taken = Number(body.seats_taken);
        if (!Number.isInteger(taken) || taken < 0) return 'Seats taken must be zero or a positive whole number.';
        if (has('capacity') && taken > Number(body.capacity)) {
            return 'Seats taken cannot be larger than capacity.';
        }
    }
    if (has('goal_amount')) {
        const goal = Number(body.goal_amount);
        if (Number.isNaN(goal) || goal < 0) return 'Goal amount must be zero or a positive number.';
    }
    if (has('full_description') && String(body.full_description).length > 4000) {
        return 'Full description must be 4000 characters or fewer.';
    }
    return null;
}

/**
 * Rejects a category / organisation id that does not exist.
 * MySQL would only complain with a terse foreign-key error, so we look
 * the rows up first and answer with something a human can act on.
 */
async function checkForeignKeys(body) {
    if (!isBlank(body.category_id)) {
        const cat = await queryOne('SELECT category_id FROM event_categories WHERE category_id = ?',
                                   [Number(body.category_id)]);
        if (!cat) return `Category ${body.category_id} does not exist.`;
    }
    if (!isBlank(body.organisation_id)) {
        const org = await queryOne('SELECT organisation_id FROM charity_organisations WHERE organisation_id = ?',
                                   [Number(body.organisation_id)]);
        if (!org) return `Organisation ${body.organisation_id} does not exist.`;
    }
    return null;
}

/* =====================================================================
 * POST /api/events   -  C(reate)
 * Body (JSON): event_name, summary, full_description, category_id,
 *              organisation_id, event_date, end_date, venue, address,
 *              suburb, city, ticket_price, is_free, capacity,
 *              goal_amount, featured, image_url
 * Answers 201 with the newly created event (in the same shape the
 * website already renders) so the admin list can append it immediately.
 * =================================================================== */
router.post('/', async (req, res, next) => {
    try {
        const body = req.body || {};

        const error = validateEventFields(body, { partial: false });
        if (error) return res.status(400).json({ success: false, message: error });

        const fkError = await checkForeignKeys(body);
        if (fkError) return res.status(400).json({ success: false, message: fkError });

        const price = Number(body.ticket_price);
        const isFree = body.is_free === undefined
            ? (price === 0 ? 1 : 0)
            : (Number(body.is_free) === 1 || body.is_free === true ? 1 : 0);

        let slug = slugify(body.event_name) || 'event';
        // keep slugs unique - the column carries a UNIQUE constraint
        const dup = await queryOne('SELECT event_id FROM events WHERE slug = ?', [slug]);
        if (dup) slug = `${slug}-${Date.now().toString().slice(-5)}`;

        const result = await run(
            `INSERT INTO events
               (organisation_id, category_id, event_name, slug, summary, full_description,
                event_date, end_date, venue, address, suburb, city,
                ticket_price, is_free, goal_amount, capacity, seats_taken,
                image_url, cover_gradient, featured, status)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                Number(body.organisation_id),
                Number(body.category_id),
                String(body.event_name).trim(),
                slug,
                String(body.summary).trim(),
                String(body.full_description || body.summary).trim(),
                String(body.event_date).trim(),
                isBlank(body.end_date) ? null : String(body.end_date).trim(),
                String(body.venue).trim(),
                String(body.address || '').trim(),
                String(body.suburb || '').trim(),
                String(body.city || 'Hebei').trim(),
                price,
                isFree,
                Number(body.goal_amount || 0),
                Number(body.capacity),
                Number(body.seats_taken || 0),
                String(body.image_url || 'assets/img/fete.svg').trim(),
                String(body.cover_gradient || 'linear-gradient(135deg,#7f1d1d,#b45309)'),
                Number(body.featured) === 1 || body.featured === true ? 1 : 0,
                'active'
            ]
        );

        const created = await queryOne(
            `SELECT ${EVENT_FIELDS} ${EVENT_JOINS} WHERE e.event_id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: `Event "${created.event_name}" was created.`,
            data:    shapeEvent(created)
        });
    } catch (err) {
        next(err);
    }
});

/* =====================================================================
 * PUT /api/events/:id   -  U(pdate)
 * Accepts a PARTIAL body: only the fields that are present are written,
 * which is what makes the admin "edit" form able to send just what the
 * staff member changed.
 * =================================================================== */
router.put('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Event id must be a positive whole number.'
            });
        }

        const body = req.body || {};
        if (!Object.keys(body).length) {
            return res.status(400).json({
                success: false,
                message: 'Nothing to update - the request body was empty.'
            });
        }

        const exists = await queryOne('SELECT event_id FROM events WHERE event_id = ?', [id]);
        if (!exists) {
            return res.status(404).json({
                success: false,
                message: `No event found with id ${id}.`
            });
        }

        const error = validateEventFields(body, { partial: true });
        if (error) return res.status(400).json({ success: false, message: error });

        const fkError = await checkForeignKeys(body);
        if (fkError) return res.status(400).json({ success: false, message: fkError });

        // Build "SET col = ?, col = ?" only for the columns supplied.
        const allowed = {
            event_name:        'event_name',
            summary:           'summary',
            full_description:  'full_description',
            event_date:        'event_date',
            end_date:          'end_date',
            venue:             'venue',
            address:           'address',
            suburb:            'suburb',
            city:              'city',
            ticket_price:      'ticket_price',
            is_free:           'is_free',
            goal_amount:       'goal_amount',
            capacity:          'capacity',
            seats_taken:       'seats_taken',
            image_url:         'image_url',
            cover_gradient:    'cover_gradient',
            featured:          'featured',
            status:            'status',
            suspension_reason: 'suspension_reason',
            category_id:       'category_id',
            organisation_id:   'organisation_id'
        };

        const sets   = [];
        const values = [];

        Object.keys(allowed).forEach((key) => {
            if (isBlank(body[key])) return;
            let value = body[key];

            if (['ticket_price', 'goal_amount'].includes(key)) value = Number(value);
            if (['capacity', 'seats_taken', 'category_id', 'organisation_id'].includes(key)) value = Number(value);
            if (['is_free', 'featured'].includes(key)) {
                value = (Number(value) === 1 || value === true) ? 1 : 0;
            }
            if (['event_name', 'summary', 'venue', 'address', 'suburb', 'city',
                 'full_description', 'image_url', 'cover_gradient', 'status',
                 'suspension_reason'].includes(key)) {
                value = String(value).trim();
            }
            if (key === 'status' && !['active', 'suspended'].includes(value)) {
                // ignored by the caller's validation - keep the DB honest
                value = 'active';
            }

            sets.push(`${allowed[key]} = ?`);
            values.push(value);
        });

        // status is an ENUM column: keep it valid no matter what was sent
        if (!sets.length) {
            return res.status(400).json({
                success: false,
                message: 'No writable fields were supplied.'
            });
        }

        values.push(id);
        await run(`UPDATE events SET ${sets.join(', ')} WHERE event_id = ?`, values);

        const updated = await queryOne(
            `SELECT ${EVENT_FIELDS} ${EVENT_JOINS} WHERE e.event_id = ?`,
            [id]
        );

        res.json({
            success: true,
            message: `Event ${id} was updated.`,
            data:    shapeEvent(updated)
        });
    } catch (err) {
        next(err);
    }
});

/* =====================================================================
 * DELETE /api/events/:id   -  D(elete)
 * DATA INTEGRITY RULE REQUIRED BY THE BRIEF:
 *   an event may only be deleted while it has no registrations.
 *   If registrations exist the request is refused with 409 Conflict and
 *   a message saying how many registrations are in the way, so the admin
 *   site can explain exactly why the button did nothing.
 * =================================================================== */
router.delete('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Event id must be a positive whole number.'
            });
        }

        const event = await queryOne(
            'SELECT event_id, event_name FROM events WHERE event_id = ?',
            [id]
        );
        if (!event) {
            return res.status(404).json({
                success: false,
                message: `No event found with id ${id}.`
            });
        }

        const countRow = await queryOne(
            'SELECT COUNT(*) AS n FROM registrations WHERE event_id = ?',
            [id]
        );
        const registrations = Number(countRow.n);

        if (registrations > 0) {
            return res.status(409).json({
                success: false,
                message: `Cannot delete "${event.event_name}" because ` +
                         `${registrations} registration(s) already exist for it. ` +
                         'Remove the registrations first, or suspend the event instead.',
                registrations: registrations
            });
        }

        // No registrations -> safe to remove. Donations cascade away too
        // through the foreign keys on the child tables.
        await run('DELETE FROM donations WHERE event_id = ?', [id]);
        await run('DELETE FROM goals     WHERE event_id = ?', [id]);
        await run('DELETE FROM events    WHERE event_id = ?', [id]);

        res.json({
            success: true,
            message: `Event "${event.event_name}" was deleted.`
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
// The admin route file re-uses the exact same SELECT and reshaping
// function, so both websites always receive identical event objects.
module.exports.shapeEvent   = shapeEvent;
module.exports.EVENT_FIELDS = EVENT_FIELDS;
module.exports.EVENT_JOINS  = EVENT_JOINS;
