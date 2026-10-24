const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { create, list, update, remove } = require('../controllers/categories.controller');

const router = express.Router();
router.use(requireAuth);
router.post('/', create);
router.get('/', list);
router.put('/:id', update);
router.delete('/:id', remove);
module.exports = router;
