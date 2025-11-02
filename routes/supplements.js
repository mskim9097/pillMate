const express = require('express');
const router = express.Router();
const c = require('../controllers/supplementsController');

router.post('/', c.addSupplement);
router.get('/api/:id', c.getOne);
router.post('/:id', c.updateSupplement);
router.delete('/:id', c.deleteSupplement);

module.exports = router;