const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const { pool } = require('../config/database');
const AdminController = require('../controllers/adminController');

// Middleware de autenticación para todas las rutas del dashboard
router.use(requireAuth);

// Dashboard principal - redirige según el rol
router.get('/', async (req, res) => {
    const userRole = req.session.user.role;
    
    try {
        if (userRole === 'admin') {
            // Para admins, usar el nuevo controlador
            return AdminController.getDashboard(req, res);
        } else if (userRole === 'profesor') {
            // Dashboard de profesor
            const [profesores] = await pool.query('SELECT * FROM profesores WHERE user_id = ?', [req.session.user.id]);
            const profesor = profesores[0];

            if (!profesor) {
                 return res.status(404).send('No se encontró información de profesor para este usuario.');
            }

            const [asignaciones] = await pool.query(`
                SELECT
                    a.id, a.año_lectivo,
                    s.name AS materia_nombre, s.codigo AS materia_codigo,
                    d.nombre_completo AS division_nombre,
                    n.nombre AS nivel_nombre,
                    m.nombre AS modalidad_nombre,
                    (SELECT COUNT(*) FROM estudiantes WHERE division_id = d.id) AS total_estudiantes
                FROM asignaciones a
                JOIN subjects s ON a.subject_id = s.id
                JOIN divisiones d ON a.division_id = d.id
                JOIN niveles n ON d.nivel_id = n.id
                JOIN modalidades m ON n.modalidad_id = m.id
                WHERE a.profesor_id = ? AND a.is_active = TRUE
                ORDER BY m.nombre, n.numero, d.division, s.name
            `, [profesor.id]);

            return res.render('dashboard/profesor', { 
                title: 'Dashboard Profesor',
                user: req.session.user,
                profesor: profesor,
                asignaciones: asignaciones
            });
        } else if (userRole === 'student') {
            const [estudiantes] = await pool.query('SELECT * FROM estudiantes WHERE user_id = ?', [req.session.user.id]);
            if (estudiantes.length === 0) {
                return res.status(404).send('No se encontró información de estudiante para este usuario.');
            }
            const estudiante = estudiantes[0];

            const [historial] = await pool.query(`
                SELECT DISTINCT año_lectivo
                FROM grades
                WHERE estudiante_id = ?
                ORDER BY año_lectivo DESC
            `, [estudiante.id]);
            
            const añosCursados = historial.map(h => h.año_lectivo);

            return res.render('dashboard/student', { 
                title: 'Dashboard Estudiante',
                user: req.session.user,
                estudiante: estudiante,
                años: añosCursados
            });
        } else {
            // Rol desconocido
            return res.redirect('/logout');
        }
    } catch (error) {
        console.error('Error en dashboard:', error);
        res.status(500).render('errors/500', { title: 'Error del servidor' });
    }
});

// Ruta específica para admin (legacy)
router.get('/admin', requireRole(['admin']), AdminController.getDashboard);

// Rutas específicas para otros roles
router.get('/profesor', requireRole(['profesor']), async (req, res) => {
    try {
        const [profesores] = await pool.query('SELECT * FROM profesores WHERE user_id = ?', [req.session.user.id]);
        if (profesores.length === 0) {
            return res.status(404).send('No se encontró información de profesor para este usuario.');
        }
        const profesor = profesores[0];

        const [asignaciones] = await pool.query(`
            SELECT
                a.id, a.año_lectivo,
                s.name AS materia_nombre, s.codigo AS materia_codigo,
                d.nombre_completo AS division_nombre,
                n.nombre AS nivel_nombre,
                m.nombre AS modalidad_nombre,
                (SELECT COUNT(*) FROM estudiantes WHERE division_id = d.id) AS total_estudiantes
            FROM asignaciones a
            JOIN subjects s ON a.subject_id = s.id
            JOIN divisiones d ON a.division_id = d.id
            JOIN niveles n ON d.nivel_id = n.id
            JOIN modalidades m ON n.modalidad_id = m.id
            WHERE a.profesor_id = ? AND a.is_active = TRUE
            ORDER BY m.nombre, n.numero, d.division, s.name
        `, [profesor.id]);

        res.render('dashboard/profesor', { 
            title: 'Dashboard Profesor',
            user: req.session.user,
            profesor: profesor,
            asignaciones: asignaciones
        });
    } catch (error) {
        console.error("Error al obtener datos del profesor:", error);
        res.status(500).render('errors/500');
    }
});

router.get('/student', requireRole(['student']), async (req, res) => {
    try {
        const [estudiantes] = await pool.query('SELECT * FROM estudiantes WHERE user_id = ?', [req.session.user.id]);
        if (estudiantes.length === 0) {
            return res.status(404).send('No se encontró información de estudiante para este usuario.');
        }
        const estudiante = estudiantes[0];

        const [historial] = await pool.query(`
            SELECT DISTINCT año_lectivo
            FROM grades
            WHERE estudiante_id = ?
            ORDER BY año_lectivo DESC
        `, [estudiante.id]);
        
        const añosCursados = historial.map(h => h.año_lectivo);

        res.render('dashboard/student', { 
            title: 'Dashboard Estudiante',
            user: req.session.user,
            estudiante: estudiante,
            años: añosCursados
        });
    } catch (error) {
        console.error("Error al obtener datos del estudiante:", error);
        res.status(500).render('errors/500');
    }
});

router.get('/boletin/:ano', requireRole(['student']), async (req, res) => {
    try {
        const { ano } = req.params;
        const [estudiantes] = await pool.query('SELECT * FROM estudiantes WHERE user_id = ?', [req.session.user.id]);
        if (estudiantes.length === 0) {
            return res.status(404).send('No se encontró información de estudiante para este usuario.');
        }
        const estudiante = estudiantes[0];

        // Obtener todas las notas para el año especificado
        const [notas] = await pool.query(`
            SELECT
                s.name as materia,
                g.grade_type,
                g.grade
            FROM grades g
            JOIN subjects s ON g.subject_id = s.id
            WHERE g.estudiante_id = ? AND g.año_lectivo = ? AND g.division_id = ?
            ORDER BY s.name
        `, [estudiante.id, ano, estudiante.division_id]);

        // Agrupar notas por materia
        const boletin = notas.reduce((acc, nota) => {
            if (!acc[nota.materia]) {
                acc[nota.materia] = { materia: nota.materia };
            }
            acc[nota.materia][nota.grade_type] = nota.grade;
            return acc;
        }, {});

        // Obtener el nombre del curso para ese año
        const [cursoInfo] = await pool.query(`
            SELECT d.nombre_completo 
            FROM divisiones d
            JOIN estudiantes e ON e.division_id = d.id
            WHERE e.id = ? LIMIT 1
        `, [estudiante.id]);


        res.render('dashboard/boletin', {
            title: `Boletín del ${ano}`,
            user: req.session.user,
            ano,
            curso: cursoInfo.length > 0 ? cursoInfo[0].nombre_completo : 'N/A',
            boletin: Object.values(boletin)
        });
    } catch (error) {
        console.error("Error al obtener el boletín:", error);
        res.status(500).render('errors/500');
    }
});

router.get('/calificaciones/:asignacionId', requireRole(['profesor']), async (req, res) => {
    try {
        const { asignacionId } = req.params;
        const [profesores] = await pool.query('SELECT * FROM profesores WHERE user_id = ?', [req.session.user.id]);
        
        if (profesores.length === 0) {
            return res.status(403).send('Acceso denegado. No es un profesor.');
        }
        const profesor = profesores[0];

        // 1. Obtener detalles de la asignación y verificar propiedad
        const [asignaciones] = await pool.query(`
            SELECT
                a.id, a.año_lectivo,
                s.name AS materia_nombre, s.id AS subject_id,
                d.nombre_completo AS division_nombre, d.id as division_id,
                n.nombre AS nivel_nombre, n.id as nivel_id,
                m.nombre AS modalidad_nombre
            FROM asignaciones a
            JOIN subjects s ON a.subject_id = s.id
            JOIN divisiones d ON a.division_id = d.id
            JOIN niveles n ON d.nivel_id = n.id
            JOIN modalidades m ON n.modalidad_id = m.id
            WHERE a.id = ? AND a.profesor_id = ? AND a.is_active = TRUE
        `, [asignacionId, profesor.id]);

        if (asignaciones.length === 0) {
            return res.status(404).send('Asignación no encontrada o no tiene permiso para verla.');
        }
        const asignacion = asignaciones[0];

        // 2. Obtener estudiantes y sus calificaciones
        const [estudiantes] = await pool.query(`
            SELECT
                u.id as user_id, e.id as estudiante_id, u.first_name, u.last_name, e.legajo,
                MAX(CASE WHEN g.grade_type = 'informe1' THEN g.grade END) as informe1,
                MAX(CASE WHEN g.grade_type = 'informe2' THEN g.grade END) as informe2,
                MAX(CASE WHEN g.grade_type = 'cuatrimestre1' THEN g.grade END) as cuatrimestre1,
                MAX(CASE WHEN g.grade_type = 'informe3' THEN g.grade END) as informe3,
                MAX(CASE WHEN g.grade_type = 'informe4' THEN g.grade END) as informe4,
                MAX(CASE WHEN g.grade_type = 'cuatrimestre2' THEN g.grade END) as cuatrimestre2,
                MAX(CASE WHEN g.grade_type = 'final' THEN g.grade END) as final
            FROM estudiantes e
            JOIN users u ON e.user_id = u.id
            LEFT JOIN grades g ON g.estudiante_id = e.id AND g.subject_id = ? AND g.año_lectivo = ?
            WHERE e.division_id = ? AND u.is_active = TRUE
            GROUP BY u.id, e.id, u.first_name, u.last_name, e.legajo
            ORDER BY u.last_name, u.first_name
        `, [asignacion.subject_id, asignacion.año_lectivo, asignacion.division_id]);
        
        res.render('dashboard/calificaciones', {
            title: `Calificaciones de ${asignacion.materia_nombre}`,
            user: req.session.user,
            asignacion,
            estudiantes
        });

    } catch (error) {
        console.error("Error al cargar la página de calificaciones:", error);
        res.status(500).render('errors/500');
    }
});

module.exports = router; 