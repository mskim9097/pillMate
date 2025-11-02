// controllers/supplementsController.js
const Joi = require('joi');
const db = require('../db');

const timeRegex = /^\d{2}:\d{2}$/;

// add supplement
exports.addSupplement = async (req, res) => {
    const user = req.session.user;
    let { name, dosage, times } = req.body;
    times = Array.isArray(times) ? times : (times ? [times] : []);

    const schema = Joi.object({
        name: Joi.string().max(100).required(),
        dosage: Joi.string().allow('', null).max(50),
        times: Joi.array().items(Joi.string().pattern(timeRegex)).min(1).max(12)
    });

    const v = schema.validate({ name, dosage, times });
    if (v.error) {
        return res.status(400).send('Invalid form data.');
    }

    await db.query('BEGIN');
    try {
        const insSupp = `
      INSERT INTO supplement (user_id, supplement_name, supplement_dosage)
      VALUES ($1, $2, $3)
      RETURNING supplement_id
    `;
        const { rows } = await db.query(insSupp, [user.id, v.value.name, v.value.dosage || null]);
        const supplementId = rows[0].supplement_id;

        const insTime = `
      INSERT INTO supplement_time (user_id, supplement_id, local_time)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `;
        for (const t of v.value.times) {
            await db.query(insTime, [user.id, supplementId, t]);
        }

        await db.query('COMMIT');
        return res.redirect('/main');
    } catch (e) {
        await db.query('ROLLBACK');
        console.error(e);
        return res.status(500).send('Failed to create supplement.');
    }
};

// get supplement (single)
exports.getOne = async (req, res) => {
    const user = req.session.user;
    const { id } = req.params;

    try {
        const s = await db.query(
            `SELECT supplement_id, supplement_name, supplement_dosage
         FROM supplement
        WHERE user_id = $1 AND supplement_id = $2`,
            [user.id, id]
        );
        if (!s.rowCount) return res.status(404).json({ error: 'Not found' });

        const t = await db.query(
            `SELECT TO_CHAR(local_time, 'HH24:MI') AS local_time
         FROM supplement_time
        WHERE user_id = $1 AND supplement_id = $2
        ORDER BY local_time`,
            [user.id, id]
        );

        return res.json({
            id: s.rows[0].supplement_id,
            name: s.rows[0].supplement_name,
            dosage: s.rows[0].supplement_dosage,
            times: t.rows.map(r => r.local_time)
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Server error' });
    }
};

// update supplement
exports.updateSupplement = async (req, res) => {
    const user = req.session.user;
    const { id } = req.params;
    let { name, dosage, times } = req.body;
    times = Array.isArray(times) ? times : (times ? [times] : []);

    const schema = Joi.object({
        name: Joi.string().max(100).required(),
        dosage: Joi.string().allow('', null).max(50),
        times: Joi.array().items(Joi.string().pattern(timeRegex)).min(1).max(12)
    });

    const v = schema.validate({ name, dosage, times });
    if (v.error) {
        return res.status(400).send('Invalid form data.');
    }

    await db.query('BEGIN');
    try {
        // verify ownership
        const own = await db.query(
            `SELECT 1 FROM supplement WHERE user_id=$1 AND supplement_id=$2`,
            [user.id, id]
        );
        if (!own.rowCount) {
            await db.query('ROLLBACK');
            return res.status(404).send('Not found');
        }

        // update supplement
        await db.query(
            `UPDATE supplement
          SET supplement_name=$1, supplement_dosage=$2
        WHERE supplement_id=$3 AND user_id=$4`,
            [v.value.name, v.value.dosage || null, id, user.id]
        );

        // refresh times
        await db.query(
            `DELETE FROM supplement_time WHERE user_id=$1 AND supplement_id=$2`,
            [user.id, id]
        );
        const insTime = `
      INSERT INTO supplement_time (user_id, supplement_id, local_time)
      VALUES ($1,$2,$3)
      ON CONFLICT DO NOTHING
    `;
        for (const t of v.value.times) {
            await db.query(insTime, [user.id, id, t]);
        }

        await db.query('COMMIT');
        return res.redirect('/main');
    } catch (e) {
        await db.query('ROLLBACK');
        console.error(e);
        return res.status(500).send('Failed to update supplement.');
    }
};

// delete supplement
exports.deleteSupplement = async (req, res) => {
    const user = req.session.user;
    const { id } = req.params;

    try {
        const del = await db.query(
            `DELETE FROM supplement WHERE user_id=$1 AND supplement_id=$2`,
            [user.id, id]
        );
        if (!del.rowCount) return res.status(404).send('Not found');
        return res.status(200).send('OK');
    } catch (e) {
        console.error(e);
        return res.status(500).send('Failed to delete.');
    }
};