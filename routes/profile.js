// routes/profile.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const profile = require('../controllers/profileController');

router.get('/', requireLogin, profile.getProfile);          // GET /profile
router.post('/', requireLogin, profile.postProfile);        // POST /profile (name, tz)
router.post('/password', requireLogin, profile.postPassword); // POST /profile/password

module.exports = router;