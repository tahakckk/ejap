const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/statusController');

router.get('/', ctrl.getAllStatuses);

module.exports = router;
