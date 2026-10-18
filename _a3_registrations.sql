-- =====================================================================
-- PROG2002 A3 - registrations table (Part 1: database improvement)
-- Student: Xinliang Wang (24832805)
-- =====================================================================
USE charityevents_db;

-- ---------------------------------------------------------------------
-- 1. New table: registrations
--    One row = one person registering for one event.
--    * registration_id   primary key (unique identifier)
--    * event_id          foreign key -> events(event_id)
--    * user details      full_name, email, phone
--    * tickets           how many tickets were purchased
--    * registration_date when the registration was made
--    * UNIQUE(event_id, email)  -> one user may register for several
--                                  different events, but can only
--                                  register ONCE for the same event.
--    * ON DELETE CASCADE -> deleting an event removes its registrations
--      (the API blocks deletion while registrations exist, so in practice
--       the cascade is only a safety net).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registrations (
    registration_id   INT AUTO_INCREMENT PRIMARY KEY,
    event_id          INT           NOT NULL,
    full_name         VARCHAR(120)  NOT NULL,
    email             VARCHAR(160)  NOT NULL,
    phone             VARCHAR(40)   NULL,
    tickets           INT           NOT NULL DEFAULT 1,
    registration_date DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note              VARCHAR(255)  NULL,
    CONSTRAINT fk_registrations_event
        FOREIGN KEY (event_id) REFERENCES events (event_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_registration_event_email
        UNIQUE (event_id, email),
    CONSTRAINT chk_registration_tickets
        CHECK (tickets > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- ---------------------------------------------------------------------
-- 2. Sample data - 12 registrations (brief requires a minimum of 10)
--    Spread over six different events; one person (Li Wei) registers for
--    two different events to show that "one user, many events" works,
--    while the unique key stops the same email booking twice.
--    Event 7 is intentionally left WITHOUT registrations so the
--    delete rule (blocked / allowed) can be demonstrated both ways.
-- ---------------------------------------------------------------------
DELETE FROM registrations;

INSERT INTO registrations
    (event_id, full_name, email, phone, tickets, registration_date, note)
VALUES
 (3,  'Zhang Wei',      'zhang.wei@example.com',      '0311-8855-1021', 2, '2026-10-02 09:14:00', 'Vegetarian meal please.'),
 (3,  'Li Na',          'li.na@example.com',          '0311-8866-3344', 4, '2026-10-04 20:02:00', 'Table near the stage.'),
 (3,  'Wang Fang',      'wang.fang@example.com',      '0311-8877-5566', 1, '2026-10-09 12:47:00', NULL),
 (3,  'Chen Hao',       'chen.hao@example.com',       '0311-8899-7788', 2, '2026-10-12 18:31:00', 'Bringing a colleague.'),
 (4,  'Liu Yang',       'liu.yang@example.com',       '0315-2200-1188', 3, '2026-10-05 07:55:00', 'Walking with my daughter.'),
 (4,  'Zhao Min',       'zhao.min@example.com',       '0315-2211-2233', 1, '2026-10-11 21:20:00', NULL),
 (4,  'Sun Qiang',      'sun.qiang@example.com',      '0315-2233-4455', 5, '2026-10-14 08:05:00', 'Team of five from the factory.'),
 (5,  'Zhou Ling',      'zhou.ling@example.com',      '0335-6600-9001', 2, '2026-10-06 16:40:00', 'Interested in the painting lot.'),
 (5,  'Wu Jian',        'wu.jian@example.com',        '0335-6611-2345', 1, '2026-10-13 10:12:00', NULL),
 (6,  'Xu Mei',         'xu.mei@example.com',         '0310-3300-6789', 4, '2026-10-07 13:26:00', 'Front standing tickets if possible.'),
 (6,  'Li Wei',         'li.wei@example.com',         '0310-3311-1357', 2, '2026-10-10 19:58:00', NULL),
 (10, 'Li Wei',         'li.wei@example.com',         '0316-4400-2468', 1, '2026-10-15 06:33:00', 'Running with my rescue dog.');

-- ---------------------------------------------------------------------
-- 3. Keep the denormalised seats_taken column in step with reality:
--    seats already taken + tickets bought through the new registrations.
--    (Only bumps events that still have room; nothing else changes.)
-- ---------------------------------------------------------------------
UPDATE events e
   SET e.seats_taken = LEAST(e.capacity,
                             e.seats_taken + COALESCE(
                                (SELECT SUM(r.tickets) FROM registrations r
                                  WHERE r.event_id = e.event_id), 0))
 WHERE e.event_id IN (SELECT DISTINCT event_id FROM registrations);

-- ---------------------------------------------------------------------
-- 4. Quick sanity check
-- ---------------------------------------------------------------------
SELECT r.registration_id, r.event_id, LEFT(e.event_name, 30) AS event,
       r.full_name, r.tickets, r.registration_date
  FROM registrations r
  JOIN events e ON e.event_id = r.event_id
 ORDER BY r.event_id, r.registration_date DESC;
