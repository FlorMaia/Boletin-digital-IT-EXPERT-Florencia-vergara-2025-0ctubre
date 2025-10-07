const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const GradesController = require('../controllers/gradesController');

// Middleware para profesores y administradores
const requireTeacherOrAdmin = requireRole(['admin', 'profesor']);

// Guardar o actualizar notas
router.post('/', requireTeacherOrAdmin, GradesController.saveGrades);

module.exports = router; 