// controllers/profileController.js
const Joi = require('joi');
const bcrypt = require('bcrypt');
const db = require('../db');

const saltRounds = 12;

// GET /profile
exports.getProfile = async (req, res) => {
    res.render('profile', { user: req.session.user, msg: null, err: null });
};

// POST /profile  (update basic fields)
exports.postProfile = async (req, res) => {
    const { fName, lName, timeZone } = req.body;

    const schema = Joi.object({
        fName: Joi.string().max(30).required(),
        lName: Joi.string().max(30).required(),
        timeZone: Joi.string().max(100).required()
    });

    const v = schema.validate({ fName, lName, timeZone });
    if (v.error) {
        return res.status(400).render('profile', { user: req.session.user, msg: null, err: 'Invalid form data.' });
    }

    try {
        const sql = `
      UPDATE app_user
         SET user_fname=$1, user_lname=$2, user_time_zone=$3
       WHERE user_id=$4
       RETURNING user_id, user_email, user_fname, user_lname, user_time_zone
    `;
        const { rows } = await db.query(sql, [v.value.fName, v.value.lName, v.value.timeZone, req.session.user.id]);

        // refresh session
        const u = rows[0];
        req.session.user = { id: u.user_id, email: u.user_email, fName: u.user_fname, lName: u.user_lname, tz: u.user_time_zone };

        res.render('profile', { user: req.session.user, msg: 'Profile updated.', err: null });
    } catch (e) {
        console.error(e);
        res.status(500).render('profile', { user: req.session.user, msg: null, err: 'Server error.' });
    }
};

// POST /profile/password  (change password)
exports.postPassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const schema = Joi.object({
        currentPassword: Joi.string().max(255).required(),
        newPassword: Joi.string().min(6).max(255).required()
    });

    const v = schema.validate({ currentPassword, newPassword });
    if (v.error) {
        return res.status(400).render('profile', { user: req.session.user, msg: null, err: 'Invalid password data.' });
    }

    try {
        const q = `SELECT user_password FROM app_user WHERE user_id=$1`;
        const { rows } = await db.query(q, [req.session.user.id]);
        if (!rows.length) {
            return res.status(404).render('profile', { user: req.session.user, msg: null, err: 'User not found.' });
        }

        const ok = await bcrypt.compare(v.value.currentPassword, rows[0].user_password);
        if (!ok) {
            return res.status(401).render('profile', { user: req.session.user, msg: null, err: 'Current password is incorrect.' });
        }

        const hash = await bcrypt.hash(v.value.newPassword, saltRounds);
        await db.query(`UPDATE app_user SET user_password=$1 WHERE user_id=$2`, [hash, req.session.user.id]);

        res.render('profile', { user: req.session.user, msg: 'Password changed.', err: null });
    } catch (e) {
        console.error(e);
        res.status(500).render('profile', { user: req.session.user, msg: null, err: 'Server error.' });
    }
};