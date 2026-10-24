const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { list } = require('../controllers/categories.controller');

const router = express.Router();
router.get('/', requireAuth, list);
module.exports = router;
