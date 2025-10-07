const express = require('express');
const router = express.Router();
const { requireRole } = require('../middlewares/auth');
const AdminController = require('../controllers/adminController');

// Middleware para solo admins
const requireAdmin = requireRole(['admin']);

// ===== RUTAS DEL DASHBOARD =====
router.get('/', requireAdmin, AdminController.getDashboard);

// ===== RUTAS DE USUARIOS =====
router.get('/users', requireAdmin, AdminController.getUsers);
router.get('/users/:userId', requireAdmin, AdminController.getUser);
router.post('/users', requireAdmin, AdminController.createUser);
router.put('/users/:userId', requireAdmin, AdminController.updateUser);
router.delete('/users/:userId', requireAdmin, AdminController.deleteUser);

// ===== RUTAS DE ESTADÍSTICAS =====
router.get('/stats', requireAdmin, AdminController.getStats);

// ===== RUTAS ACADÉMICAS =====
// Estadísticas y jerarquía
router.get('/estructura/stats', requireAdmin, AdminController.getEstructuraStats);
router.get('/estructura/jerarquia', requireAdmin, AdminController.getJerarquia);

// Modalidades CRUD
router.get('/modalidades', requireAdmin, AdminController.getModalidades);
router.get('/modalidades/:id', requireAdmin, AdminController.getModalidad);
router.post('/modalidades', requireAdmin, AdminController.createModalidad);
router.put('/modalidades/:id', requireAdmin, AdminController.updateModalidad);
router.delete('/modalidades/:id', requireAdmin, AdminController.deleteModalidad);

// Niveles CRUD
router.get('/niveles', requireAdmin, AdminController.getNiveles);
router.get('/niveles/:id', requireAdmin, AdminController.getNivel);
router.post('/niveles', requireAdmin, AdminController.createNivel);
router.put('/niveles/:id', requireAdmin, AdminController.updateNivel);
router.delete('/niveles/:id', requireAdmin, AdminController.deleteNivel);

// Divisiones CRUD
router.get('/divisiones', requireAdmin, AdminController.getDivisiones);
router.get('/divisiones/:id', requireAdmin, AdminController.getDivision);
router.post('/divisiones', requireAdmin, AdminController.createDivision);
router.put('/divisiones/:id', requireAdmin, AdminController.updateDivision);
router.delete('/divisiones/:id', requireAdmin, AdminController.deleteDivision);

// ===== RUTAS DE MATERIAS =====
router.get('/materias', requireAdmin, AdminController.getMaterias);
router.get('/materias/:id', requireAdmin, AdminController.getMateria);
router.post('/materias', requireAdmin, AdminController.createMateria);
router.put('/materias/:id', requireAdmin, AdminController.updateMateria);
router.delete('/materias/:id', requireAdmin, AdminController.deleteMateria);
router.get('/materias/nivel/:nivelId', requireAdmin, AdminController.getMateriasPorNivel);

// ===== RUTAS DE ASIGNACIONES =====
router.get('/asignaciones', requireAdmin, AdminController.getAsignaciones);

module.exports = router; 