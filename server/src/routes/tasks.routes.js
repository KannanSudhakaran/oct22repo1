const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { create, list, getOne, update, remove } = require('../controllers/tasks.controller');

const router = express.Router();
router.use(requireAuth);
router.post('/', create);
router.get('/', list);
router.get('/:id', getOne);
router.put('/:id', update);
router.delete('/:id', remove);
module.exports = router;
