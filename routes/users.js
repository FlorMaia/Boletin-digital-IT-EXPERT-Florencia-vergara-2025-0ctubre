const express = require('express');
const router = express.Router();
const { requireRole } = require('../middlewares/auth');
const UsersController = require('../controllers/usersController');

// Eliminar usuario (solo para admins)
router.delete('/:userId', requireRole(['admin']), UsersController.deleteUser);

module.exports = router; 