// middleware/auth.js
function isLoggedIn(req) {
    return !!(req.session && req.session.authenticated);
}

function requireLogin(req, res, next) {
    if (!isLoggedIn(req)) return res.redirect('/login');
    next();
}

module.exports = { isLoggedIn, requireLogin };