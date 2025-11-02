// routes/dose.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const dose = require('../controllers/doseController');

router.post('/toggle', requireLogin, dose.toggle);

module.exports = router;