/* =====================================================================
 * PROG2002 - Web Development II
 * Assessment 3 : Complete Dynamic Website - Charity Events (Hebei)
 * Student      : Xinliang Wang  (24832805)
 *
 * event_db.js  -  Database connection layer
 * ---------------------------------------------------------------------
 * This is the ONLY file in the project that talks to MySQL. Everything
 * else (the route files) asks this module for data and never builds SQL
 * of its own, which keeps the database concern in exactly one place.
 *
 * It exports a mysql2 connection *pool* plus four helpers:
 *
 *      query(sql, params)      -> Promise<Array>    SELECT
 *      queryOne(sql, params)   -> Promise<Object>   one row or null
 *      run(sql, params)        -> Promise<Object>   INSERT / UPDATE /
 *                                                   DELETE result
 *      transaction(fn)         -> Promise<any>      run several
 *                                                   statements atomically
 *
 * Every statement uses ? placeholders, so values coming from the HTTP
 * request are bound by the driver and can never be interpreted as SQL.
 * That is the standard defence against SQL injection and it is why the
 * admin "new event" form is safe to expose.
 *
 * CHANGES FOR ASSESSMENT 3
 *   * `run()` was added because A3 writes data (INSERT / UPDATE / DELETE)
 *     and the caller needs insertId / affectedRows back from MySQL.
 *   * `transaction()` was added so a registration can update the event's
 *     seat counter and insert the registration row as one unit - if the
 *     second step fails, the first is rolled back.
 *   * The new `registrations` table (see charityevents_db.sql) is
 *     reachable through exactly the same helpers; no new connection
 *     logic was required.
 * ===================================================================== */

'use strict';

require('dotenv').config();

const mysql = require('mysql2/promise');

/* ---------------------------------------------------------------------
 * 1. Configuration
 *    Values come from the .env file so that no credential is hard coded
 *    and the same code can run locally, on a team member's machine and
 *    on the SCU cPanel without edits.
 * ------------------------------------------------------------------ */
const dbConfig = {
    host:               process.env.DB_HOST     || '127.0.0.1',
    // 3307 is the MySQL 9.7 instance this project was developed against.
    // Change DB_PORT in .env to 3306 if your MySQL 8.0 server is the
    // one holding charityevents_db.
    port:               Number(process.env.DB_PORT) || 3307,
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || '',
    database:           process.env.DB_NAME     || 'charityevents_db',

    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,

    // Keep DATE / DATETIME values as plain 'YYYY-MM-DD HH:mm:ss' strings
    // instead of JavaScript Date objects, so the JSON returned by the API
    // is stable and easy for the client to format.
    dateStrings:        true
};

/* ---------------------------------------------------------------------
 * 2. Create the pool
 *    A pool (rather than one connection) matters more in A3 than in A2:
 *    the admin site can fire a create, a refresh and a delete within the
 *    same second, and a pool reuses existing TCP sessions instead of
 *    re-authenticating for every query.
 * ------------------------------------------------------------------ */
const pool = mysql.createPool(dbConfig);

/**
 * Low level helper: execute a parameterised SQL statement.
 * @param {string} sql    SQL text with ? placeholders
 * @param {Array}  params values bound to the placeholders
 * @returns {Promise<Array>} rows returned by MySQL
 */
async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

/**
 * Convenience helper for "give me the single row that matches this id".
 * @returns {Promise<object|null>}
 */
async function queryOne(sql, params = []) {
    const rows = await query(sql, params);
    return rows.length ? rows[0] : null;
}

/**
 * Execute a WRITE statement (INSERT / UPDATE / DELETE).
 * @returns {Promise<{insertId:number, affectedRows:number}>}
 */
async function run(sql, params = []) {
    const [result] = await pool.execute(sql, params);
    return {
        insertId:     result.insertId     || 0,
        affectedRows: result.affectedRows || 0
    };
}

/**
 * Run several statements inside one transaction.
 * `fn(connection)` receives a connection that already has BEGIN issued;
 * use conn.query(...) inside it. Anything thrown rolls the work back.
 *
 * Used by: POST /api/registrations  (insert registration + bump seats)
 *          DELETE /api/events/:id   (delete event + its registrations)
 */
async function transaction(fn) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const result = await fn(conn);
        await conn.commit();
        return result;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

/**
 * Opens one connection and closes it again - used once at start-up to
 * fail fast (and with a clear message) when MySQL is not reachable or
 * the database has not been imported yet.
 */
async function testConnection() {
    const conn = await pool.getConnection();
    try {
        const [rows] = await conn.execute('SELECT DATABASE() AS db, NOW() AS now');
        return rows[0];
    } finally {
        conn.release();
    }
}

module.exports = { pool, query, queryOne, run, transaction, testConnection, dbConfig };

/* ---------------------------------------------------------------------
 * 3. Allow this file to be run directly:  npm run db:test
 *    It prints the schema it can see, which is a quick way to prove that
 *    charityevents_db.sql has been imported correctly.
 * ------------------------------------------------------------------ */
if (require.main === module) {
    (async () => {
        try {
            const info = await testConnection();
            console.log('MySQL connection OK ->', info);

            const tables = await query(
                `SELECT TABLE_NAME, TABLE_ROWS
                   FROM information_schema.TABLES
                  WHERE TABLE_SCHEMA = ?
                  ORDER BY TABLE_NAME`,
                [dbConfig.database]
            );
            console.table(tables);

            const events = await query(
                `SELECT e.event_id,
                        e.event_name,
                        e.event_date,
                        e.status,
                        c.category_name,
                        (SELECT COUNT(*) FROM registrations r
                          WHERE r.event_id = e.event_id) AS registrations
                   FROM events e
                   JOIN event_categories c ON c.category_id = e.category_id
                  ORDER BY e.event_date`
            );
            console.table(events);
            process.exit(0);
        } catch (err) {
            console.error('Database connection FAILED:', err.message);
            console.error('Check .env  (DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME)');
            console.error('and make sure charityevents_db.sql has been imported.');
            process.exit(1);
        }
    })();
}
