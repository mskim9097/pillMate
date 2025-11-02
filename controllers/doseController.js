// controllers/doseController.js
const db = require('../db');

// toggle dose (PENDING <-> TAKEN)
async function toggle(req, res) {
    const user = req.session.user;
    const { logId, supplementId, localTime, toStatus } = req.body || {};
    const tz = user?.tz || 'America/Vancouver';

    if (!supplementId || !localTime || !/^\d{2}:\d{2}$/.test(localTime)) {
        return res.status(400).send('Invalid payload');
    }
    if (toStatus !== 'TAKEN' && toStatus !== 'PENDING') {
        return res.status(400).send('Invalid target status');
    }

    await db.query('BEGIN');
    try {
        let targetLogId = Number(logId || 0);

        const buildLocalTsSql = `
      WITH tz AS (SELECT $1::text AS name),
           today AS (SELECT (now() AT TIME ZONE (SELECT name FROM tz))::date AS d)
      SELECT make_timestamptz(
               EXTRACT(YEAR  FROM (SELECT d FROM today))::int,
               EXTRACT(MONTH FROM (SELECT d FROM today))::int,
               EXTRACT(DAY   FROM (SELECT d FROM today))::int,
               split_part($2, ':', 1)::int,
               split_part($2, ':', 2)::int,
               0,
               (SELECT name FROM tz)
             ) AS scheduled_at;
    `;
        const ts = await db.query(buildLocalTsSql, [tz, localTime]);
        const scheduledAt = ts.rows[0].scheduled_at;

        if (toStatus === 'TAKEN') {
            if (!targetLogId) {
                const ins = `
          INSERT INTO dose_log (user_id, supplement_id, scheduled_at, status)
          VALUES ($1, $2, $3, 'PENDING')
          RETURNING log_id;
        `;
                const insRes = await db.query(ins, [user.id, supplementId, scheduledAt]);
                targetLogId = insRes.rows[0].log_id;
            } else {
                const own = await db.query(
                    `SELECT 1 FROM dose_log WHERE log_id=$1 AND user_id=$2`,
                    [targetLogId, user.id]
                );
                if (!own.rowCount) {
                    await db.query('ROLLBACK');
                    return res.status(404).send('Not found');
                }
            }

            await db.query(
                `UPDATE dose_log
           SET status='TAKEN', taken_at=NOW()
         WHERE log_id=$1 AND user_id=$2`,
                [targetLogId, user.id]
            );

            await db.query('COMMIT');
            return res.status(200).json({ ok: true, logId: targetLogId, status: 'TAKEN' });
        } else {
            if (!targetLogId) {
                await db.query('ROLLBACK');
                return res.status(404).send('Log not found');
            }
            const own = await db.query(
                `SELECT 1 FROM dose_log WHERE log_id=$1 AND user_id=$2`,
                [targetLogId, user.id]
            );
            if (!own.rowCount) {
                await db.query('ROLLBACK');
                return res.status(404).send('Not found');
            }

            await db.query(
                `UPDATE dose_log
           SET status='PENDING', taken_at=NULL
         WHERE log_id=$1 AND user_id=$2`,
                [targetLogId, user.id]
            );

            await db.query('COMMIT');
            return res.status(200).json({ ok: true, logId: targetLogId, status: 'PENDING' });
        }
    } catch (e) {
        await db.query('ROLLBACK');
        console.error(e);
        return res.status(500).send('Server error');
    }
}

module.exports = { toggle };