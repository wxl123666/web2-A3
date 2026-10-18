/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events (Hebei)
 * Student      : Xinliang Wang  (24832805)
 *
 * server.js  -  Express application entry point
 * ---------------------------------------------------------------------
 * Starts the RESTful API and mounts:
 *
 *      /api/events          routes/events.js        (CRUD)
 *      /api/registrations   routes/registrations.js (create / list)
 *      /api/admin           routes/admin.js         (full listing)
 *      /api/categories      routes/categories.js
 *      /api/organisations   routes/organisations.js
 *      /api/stats           routes/stats.js
 *      /api/health          start-up self check
 *
 * Run it with:   npm install  ->  npm start
 *
 * WHAT CHANGED SINCE ASSESSMENT 2
 *   * The "GET only" guard was removed: A3 needs POST, PUT and DELETE
 *     for the admin site. Unknown methods still get a clean 405, but
 *     they are now decided per route by Express instead of globally.
 *   * express.json() was already there; it is what lets POST /api/events
 *     and POST /api/registrations read a JSON request body.
 *   * CORS now allows the write methods as well, so the admin site can
 *     be served from a different port (or from cPanel) and still call
 *     the API.
 * ===================================================================== */

'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const { testConnection } = require('./event_db');
const eventsRoutes        = require('./routes/events');
const registrationsRoutes = require('./routes/registrations');
const adminRoutes         = require('./routes/admin');
const categoriesRoutes    = require('./routes/categories');
const organisationsRoutes = require('./routes/organisations');
const statsRoutes         = require('./routes/stats');

const app  = express();
const PORT = Number(process.env.API_PORT) || 3000;

/* ---------------------------------------------------------------------
 * 1. Middleware
 * ------------------------------------------------------------------ */

// CORS: the two websites are served from different origins (different
// ports locally, different folders on cPanel), so the browser would
// block the requests without this header. All three deliverables can
// therefore stay in separate zips while still talking to each other.
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// Parses JSON request bodies -> req.body in POST / PUT handlers.
app.use(express.json());

// Small request log - handy while demonstrating the data flow in the video.
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

/* ---------------------------------------------------------------------
 * 2. Routes
 * ------------------------------------------------------------------ */
app.get('/api/health', async (req, res) => {
    try {
        const info = await testConnection();
        res.json({
            success: true,
            message: 'Charity Events API is running (Assessment 3).',
            database: info.db,
            server_time: info.now
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'API is running but cannot reach MySQL: ' + err.message
        });
    }
});

// Handy index of every endpoint - open http://localhost:3000/api in a browser.
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Charity Events API (PROG2002 A3)',
        endpoints: [
            { method: 'GET',    path: '/api/health',
              description: 'API + database health check' },
            { method: 'GET',    path: '/api/events',
              description: 'Published events. ?time=upcoming|past|all, ?featured=1, ?limit=N' },
            { method: 'GET',    path: '/api/events/search',
              description: 'Filter by ?date, ?date_to, ?location, ?category, ?q, ?max_price, ?free' },
            { method: 'GET',    path: '/api/events/:id',
              description: 'One event + category + organisation + goal + donations + REGISTRATIONS' },
            { method: 'GET',    path: '/api/events/:id/similar',
              description: 'Up to three other upcoming events in the same category' },
            { method: 'POST',   path: '/api/events',
              description: 'Create a charity event (admin site)' },
            { method: 'PUT',    path: '/api/events/:id',
              description: 'Update an existing event (admin site)' },
            { method: 'DELETE', path: '/api/events/:id',
              description: 'Delete an event - refused with 409 while registrations exist' },
            { method: 'GET',    path: '/api/registrations?event_id=N',
              description: 'Registrations for an event, newest first' },
            { method: 'POST',   path: '/api/registrations',
              description: 'Register a person for an event (registration page)' },
            { method: 'DELETE', path: '/api/registrations/:id',
              description: 'Remove a registration (so a blocked delete can be retried)' },
            { method: 'GET',    path: '/api/admin/events',
              description: 'ALL events including suspended and past (admin list)' },
            { method: 'GET',    path: '/api/admin/events/:id',
              description: 'One event of any status + its registrations (admin edit page)' },
            { method: 'GET',    path: '/api/categories',
              description: 'Categories for the dropdowns (with event counts)' },
            { method: 'GET',    path: '/api/organisations',
              description: 'Charitable organisations hosting the events' },
            { method: 'GET',    path: '/api/stats',
              description: 'Aggregate figures for the home page and admin dashboard' }
        ]
    });
});

app.use('/api/events',        eventsRoutes);
app.use('/api/registrations', registrationsRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/categories',    categoriesRoutes);
app.use('/api/organisations', organisationsRoutes);
app.use('/api/stats',         statsRoutes);

/* ---------------------------------------------------------------------
 * 3. 404 + error handling
 *    Both return JSON so the AngularJS sites can show a readable message
 *    instead of an HTML error page.
 * ------------------------------------------------------------------ */
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Unknown endpoint ${req.method} ${req.originalUrl}`
    });
});

app.use((err, req, res, next) => {          // eslint-disable-line no-unused-vars
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Unexpected server error.',
        detail:  err.message
    });
});

/* ---------------------------------------------------------------------
 * 4. Start
 * ------------------------------------------------------------------ */
(async () => {
    try {
        const info = await testConnection();
        console.log('MySQL connected ->', info.db);
    } catch (err) {
        console.error('WARNING: could not connect to MySQL ->', err.message);
        console.error('Import charityevents_db.sql and check the .env file.');
    }

    app.listen(PORT, () => {
        console.log('-------------------------------------------------------------');
        console.log(' Charity Events API  (PROG2002 Assessment 3)');
        console.log(` listening on  http://localhost:${PORT}/api`);
        console.log('-------------------------------------------------------------');
    });
})();
