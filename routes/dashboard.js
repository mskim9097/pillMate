// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.get('/main', requireLogin, ctrl.getDashboard);

module.exports = router;