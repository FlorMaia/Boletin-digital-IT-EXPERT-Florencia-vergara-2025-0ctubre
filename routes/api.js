const express = require('express');
const router = express.Router();

// Importar rutas modulares
const gradesRoutes = require('./grades');
const usersRoutes = require('./users');
const asignacionesRoutes = require('./asignaciones');

// Configurar rutas por dominio
router.use('/grades', gradesRoutes);
router.use('/users', usersRoutes);
router.use('/asignaciones', asignacionesRoutes);

module.exports = router; 