// routes/auth.js
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const auth = require('../controllers/authController');

router.get('/', auth.getLanding);

router.get('/login', (req, res) => {
    if (isLoggedIn(req)) return res.redirect('/main');
    return auth.getLogin(req, res);
});
router.post('/login', auth.postLogin);

router.get('/signup', (req, res) => {
    if (isLoggedIn(req)) return res.redirect('/main');
    return auth.getSignup(req, res);
});
router.post('/signup', auth.postSignup);

router.post('/logout', auth.postLogout);

module.exports = router;