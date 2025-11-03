const Joi = require('joi');
const bcrypt = require('bcrypt');
const db = require('../db');

const expireTime = 60 * 60 * 1000;
const saltRounds = 12;

// GET /
exports.getLanding = (req, res) => {
    if (req.session?.authenticated) return res.redirect('/main');
    const s = req.session || {};
    res.render('index', {
        authenticated: !!s.authenticated,
        name: s.user?.fName || s.name || ''
    });
};

// GET /login
exports.getLogin = (req, res) => {
    res.render('login', { error: null });
};

// POST /login
exports.postLogin = async (req, res) => {
    const { email, password } = req.body;

    const schema = Joi.object({
        email: Joi.string().email().max(255).required(),
        password: Joi.string().max(255).required(),
    });
    const v = schema.validate({ email, password });
    if (v.error) {
        return res.status(400).render('login', { error: 'Invalid email or password format.' });
    }

    try {
        const sql = `
      SELECT user_id, user_email, user_password, user_fname, user_lname, user_time_zone
      FROM app_user
      WHERE user_email = $1
      LIMIT 1
    `;
        const { rows } = await db.query(sql, [v.value.email]);
        if (!rows.length) {
            return res.status(401).render('login', { error: 'User not found.' });
        }

        const u = rows[0];
        const ok = await bcrypt.compare(v.value.password, u.user_password);
        if (!ok) {
            return res.status(401).render('login', { error: 'Incorrect password.' });
        }

        req.session.authenticated = true;
        req.session.user = {
            id: u.user_id,
            email: u.user_email,
            fName: u.user_fname,
            lName: u.user_lname,
            tz: u.user_time_zone,
        };
        req.session.cookie.maxAge = expireTime;

        res.redirect('/main');
    } catch (err) {
        console.error(err);
        res.status(500).render('login', { error: 'Server error. Please try again.' });
    }
};

// GET /signup
exports.getSignup = (req, res) => {
    res.render('signup', { error: null });
};

// POST /signup
exports.postSignup = async (req, res) => {
    const { fName, lName, email, password, timeZone } = req.body;

    const schema = Joi.object({
        fName: Joi.string().max(30).required(),
        lName: Joi.string().max(30).required(),
        email: Joi.string().email().max(255).required(),
        password: Joi.string().max(255).required(),
        timeZone: Joi.string().max(100).default('America/Vancouver'),
    });

    const v = schema.validate({
        fName, lName, email, password,
        timeZone: timeZone || 'America/Vancouver',
    });
    if (v.error) {
        return res.status(400).render('signup', { error: 'Please fill out the form correctly.' });
    }

    try {
        const hash = await bcrypt.hash(v.value.password, saltRounds);
        const insertSql = `
      INSERT INTO app_user (user_email, user_password, user_fname, user_lname, user_time_zone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id, user_email, user_fname, user_lname, user_time_zone
    `;
        const { rows } = await db.query(insertSql, [
            v.value.email, hash, v.value.fName, v.value.lName, v.value.timeZone,
        ]);

        const u = rows[0];
        req.session.authenticated = true;
        req.session.user = {
            id: u.user_id,
            email: u.user_email,
            fName: u.user_fname,
            lName: u.user_lname,
            tz: u.user_time_zone,
        };
        req.session.cookie.maxAge = expireTime;

        res.redirect('/main');
    } catch (err) {
        if (err && err.code === '23505') {
            return res.status(400).render('signup', { error: 'Email already exists.' });
        }
        console.error(err);
        res.status(500).render('signup', { error: 'Server error. Please try again.' });
    }
};

// POST /logout
exports.postLogout = (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
};