// controllers/dashboardController.js
const db = require('../db');

// render dashboard (supplements, today's times, recent logs)
exports.getDashboard = async (req, res) => {
    const { id: userId, tz } = req.session.user || {};
    const timezone = tz || 'America/Vancouver';

    try {
        // supplements
        const qSupp = `
      SELECT 
        supplement_id     AS id,
        supplement_name   AS name,
        supplement_dosage AS dosage
      FROM supplement
      WHERE user_id = $1
      ORDER BY supplement_name;
    `;
        const suppRes = await db.query(qSupp, [userId]);

        // today's times (from SUPPLEMENT_TIME, left join DOSE_LOG)
        const qToday = `
      WITH tz AS (SELECT $2::text AS name),
      today AS (
        SELECT (now() AT TIME ZONE (SELECT name FROM tz))::date AS d
      ),
      inst AS (
        SELECT
          st.user_id,
          st.supplement_id,
          make_timestamptz(
            EXTRACT(YEAR   FROM (SELECT d FROM today))::int,
            EXTRACT(MONTH  FROM (SELECT d FROM today))::int,
            EXTRACT(DAY    FROM (SELECT d FROM today))::int,
            EXTRACT(HOUR   FROM st.local_time)::int,
            EXTRACT(MINUTE FROM st.local_time)::int,
            0,
            (SELECT name FROM tz)
          ) AT TIME ZONE (SELECT name FROM tz) AS scheduled_local_ts,
          to_char(st.local_time, 'HH24:MI') AS local_time_str
        FROM supplement_time st
        WHERE st.user_id = $1
      ),
      joined AS (
        SELECT
          COALESCE(dl.log_id, 0)         AS id,
          s.supplement_id                AS supplement_id,
          s.supplement_name              AS supplement_name,
          i.local_time_str               AS local_time,
          COALESCE(dl.status, 'PENDING') AS status
        FROM inst i
        JOIN supplement s
          ON s.supplement_id = i.supplement_id
         AND s.user_id       = i.user_id
        LEFT JOIN dose_log dl
          ON dl.user_id       = i.user_id
         AND dl.supplement_id = i.supplement_id
         AND (dl.scheduled_at AT TIME ZONE (SELECT name FROM tz))::date = (i.scheduled_local_ts)::date
         AND to_char(dl.scheduled_at AT TIME ZONE (SELECT name FROM tz), 'HH24:MI') = i.local_time_str
      )
      SELECT id, supplement_id, local_time, supplement_name, status
      FROM joined
      ORDER BY local_time, supplement_name;
    `;
        const todayRes = await db.query(qToday, [userId, timezone]);

        // recent logs (last 10)
        const qRecent = `
      SELECT
        dl.log_id AS id,
        s.supplement_name AS supplement_name,
        dl.status,
        to_char(
          coalesce(dl.taken_at, dl.scheduled_at) AT TIME ZONE $2,
          'Mon DD, HH24:MI'
        ) AS when_str
      FROM dose_log dl
      JOIN supplement s ON s.supplement_id = dl.supplement_id
      WHERE dl.user_id = $1
      ORDER BY coalesce(dl.taken_at, dl.scheduled_at) DESC
      LIMIT 10;
    `;
        const recentRes = await db.query(qRecent, [userId, timezone]);

        const supplements = suppRes.rows.map(r => ({
            id: r.id,
            name: r.name,
            dosage: r.dosage || ''
        }));

        const times = todayRes.rows.map(r => ({
            id: r.id,                         // dose_log.log_id
            supplementId: Number(r.supplement_id),
            localTime: r.local_time,          // "HH:MM"
            supplementName: r.supplement_name,
            status: r.status
        }));

        const doseLogs = recentRes.rows.map(r => ({
            id: r.id,
            supplementName: r.supplement_name,
            status: r.status,
            when: r.when_str
        }));

        res.render('main', { user: req.session.user, supplements, times, doseLogs });
    } catch (e) {
        console.error(e);
        res.status(500).render('main', {
            user: req.session.user,
            supplements: [],
            times: [],
            doseLogs: []
        });
    }
};