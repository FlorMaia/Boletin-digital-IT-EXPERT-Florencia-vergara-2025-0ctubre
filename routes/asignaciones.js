const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const AsignacionController = require('../controllers/asignacionController');

router.get(
    '/:asignacionId/estudiantes', 
    requireAuth, 
    requireRole(['profesor', 'admin']),
    AsignacionController.getEstudiantesPorAsignacion
);

module.exports = router; 