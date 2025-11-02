// index.js — app wiring, sessions, routers
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const db = require('./db');
const { requireLogin } = require('./middleware/auth');

const app = express();
app.set('trust proxy', 1); // behind proxy (Render, etc.)

const port = process.env.PORT || 3000;
const expireTime = 60 * 60 * 1000;

// views & parsers
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname + '/public'));

// sessions (must come before res.locals injector)
const cookieBase = { maxAge: expireTime, sameSite: 'lax' };
if (process.env.NODE_ENV === 'production') cookieBase.secure = true;

app.use(session({
    store: new pgSession({
        pool: db.pool,
        tableName: 'session',
        createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'devsecret',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: cookieBase
}));

// make user/auth available to all EJS
app.use((req, res, next) => {
    res.locals.user = req.session?.user || null;
    res.locals.authenticated = !!req.session?.authenticated;
    next();
});

// routers
const authRouter = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const supplementsRouter = require('./routes/supplements');
const doseRouter = require('./routes/dose');

app.use('/', authRouter);                    // landing, login, signup, logout
app.use('/', dashboardRouter);               // /main
app.use('/supplements', requireLogin, supplementsRouter);
app.use('/dose', requireLogin, doseRouter);

// 404
app.get(/.*/, (req, res) => res.status(404).render('404'));

app.listen(port, () => {
    console.log(`✅ Server running → http://localhost:${port}`);
});