const User = require('../models/User');

const dashboardController = {
    // Dashboard principal - redirige según el rol
    index: async (req, res) => {
        try {
            const user = req.session.user;
            
            switch (user.role) {
                case 'admin':
                    return res.redirect('/dashboard/admin');
                case 'profesor':
                    return res.redirect('/dashboard/profesor');
                case 'student':
                    return res.redirect('/dashboard/student');
                default:
                    req.flash('error_msg', 'Rol de usuario no válido');
                    return res.redirect('/logout');
            }
        } catch (error) {
            console.error('Error en dashboard:', error);
            req.flash('error_msg', 'Error al cargar el dashboard');
            res.redirect('/');
        }
    },

    // Dashboard del administrador
    adminDashboard: async (req, res) => {
        try {
            const user = req.session.user;
            const { pool } = require('../config/database');
            
            // Obtener todos los usuarios desde la base de datos
            const [usuarios] = await pool.execute(`
                SELECT id, first_name, last_name, email, role, curso, dni, is_active, created_at
                FROM users 
                WHERE is_active = TRUE 
                ORDER BY role, first_name, last_name
            `);

            // Obtener estadísticas
            const [stats] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_usuarios,
                    SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as total_estudiantes,
                    SUM(CASE WHEN role = 'profesor' THEN 1 ELSE 0 END) as total_profesores,
                    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as total_admins
                FROM users 
                WHERE is_active = TRUE
            `);

            res.render('dashboard/admin', {
                title: 'Dashboard del Administrador - Colegio Ernesto Guevara',
                user: user,
                usuarios: usuarios,
                stats: stats[0]
            });

        } catch (error) {
            console.error('Error en dashboard admin:', error);
            req.flash('error_msg', 'Error al cargar el panel de administración');
            res.redirect('/');
        }
    },

    // Dashboard del profesor
    profesorDashboard: async (req, res) => {
        try {
            const user = req.session.user;
            const { pool } = require('../config/database');
            
            // Obtener información del profesor
            const [profesor] = await pool.execute(`
                SELECT p.*, u.first_name, u.last_name, u.email
                FROM profesores p
                JOIN users u ON p.user_id = u.id
                WHERE u.id = ?
            `, [user.id]);

            if (profesor.length === 0) {
                req.flash('error_msg', 'No se encontró información del profesor');
                return res.redirect('/logout');
            }

            // Obtener asignaciones del profesor con información completa
            const [asignaciones] = await pool.execute(`
                SELECT a.id, a.año_lectivo,
                       s.name as materia_nombre, s.codigo as materia_codigo,
                       d.nombre_completo as division_nombre,
                       n.nombre as nivel_nombre,
                       m.nombre as modalidad_nombre,
                       COUNT(e.id) as total_estudiantes
                FROM asignaciones a
                JOIN subjects s ON a.subject_id = s.id
                JOIN divisiones d ON a.division_id = d.id
                JOIN niveles n ON d.nivel_id = n.id
                JOIN modalidades m ON n.modalidad_id = m.id
                LEFT JOIN estudiantes e ON e.division_id = d.id
                WHERE a.profesor_id = ? AND a.is_active = TRUE AND a.año_lectivo = YEAR(CURDATE())
                GROUP BY a.id, s.name, s.codigo, d.nombre_completo, n.nombre, m.nombre
                ORDER BY m.nombre, n.numero, d.division, s.name
            `, [profesor[0].id]);

            res.render('dashboard/profesor', {
                title: 'Dashboard del Profesor - Colegio Ernesto Guevara',
                user: user,
                profesor: profesor[0],
                asignaciones: asignaciones
            });

        } catch (error) {
            console.error('Error en dashboard profesor:', error);
            req.flash('error_msg', 'Error al cargar el panel del profesor');
            res.redirect('/');
        }
    },

    // Dashboard del estudiante
    studentDashboard: async (req, res) => {
        try {
            const user = req.session.user;
            
            // Obtener notas reales del estudiante desde la base de datos
            const { pool } = require('../config/database');
            
            const [notasRows] = await pool.execute(`
                SELECT 
                    s.name as materia,
                    MAX(CASE WHEN g.grade_type = 'informe1' THEN g.grade END) as inf1,
                    MAX(CASE WHEN g.grade_type = 'informe2' THEN g.grade END) as inf2,
                    MAX(CASE WHEN g.grade_type = 'cuatrimestre1' THEN g.grade END) as cuatr1,
                    MAX(CASE WHEN g.grade_type = 'informe3' THEN g.grade END) as inf3,
                    MAX(CASE WHEN g.grade_type = 'informe4' THEN g.grade END) as inf4,
                    MAX(CASE WHEN g.grade_type = 'cuatrimestre2' THEN g.grade END) as cuatr2,
                    MAX(CASE WHEN g.grade_type = 'final' THEN g.grade END) as final
                FROM subjects s
                LEFT JOIN grades g ON s.id = g.subject_id AND g.student_id = ?
                GROUP BY s.id, s.name
                ORDER BY s.name
            `, [user.id]);

            // Si no hay notas en la BD, usar datos de ejemplo
            let notas = notasRows;
            if (notasRows.length === 0) {
                notas = [
                    { materia: 'Test Vocacional', inf1: 8, inf2: 7, cuatr1: 7.5, inf3: 9, inf4: 8, cuatr2: 8.5, final: 8 },
                    { materia: 'Inglés', inf1: 7, inf2: 8, cuatr1: 7.5, inf3: 8, inf4: 9, cuatr2: 8.5, final: 8 },
                    { materia: 'Matemáticas', inf1: 6, inf2: 7, cuatr1: 6.5, inf3: 8, inf4: 7, cuatr2: 7.5, final: 7 },
                    { materia: 'Marco Jurídico', inf1: 9, inf2: 8, cuatr1: 8.5, inf3: 9, inf4: 9, cuatr2: 9, final: 9 },
                    { materia: 'Arduino', inf1: 8, inf2: 9, cuatr1: 8.5, inf3: 9, inf4: 8, cuatr2: 8.5, final: 8.5 },
                    { materia: 'Asistencia', inf1: 10, inf2: 10, cuatr1: 10, inf3: 10, inf4: 10, cuatr2: 10, final: 10 },
                    { materia: 'Programación', inf1: 9, inf2: 8, cuatr1: 8.5, inf3: 9, inf4: 9, cuatr2: 9, final: 9 },
                    { materia: 'Autogestión', inf1: 8, inf2: 9, cuatr1: 8.5, inf3: 9, inf4: 9, cuatr2: 8.5, final: 8.5 }
                ];
            }

            res.render('dashboard/student', {
                title: 'Boletín Digital - Colegio Ernesto Guevara',
                user: user,
                notas: notas
            });

        } catch (error) {
            console.error('Error en dashboard estudiante:', error);
            req.flash('error_msg', 'Error al cargar el panel del estudiante');
            res.redirect('/');
        }
    },

    // Gestión de usuarios (solo para admin)
    manageUsers: async (req, res) => {
        try {
            const students = await User.getStudents();
            const teachers = await User.getTeachers();

            res.render('dashboard/manage-users', {
                title: 'Gestión de Usuarios',
                students: students,
                teachers: teachers
            });

        } catch (error) {
            console.error('Error al cargar gestión de usuarios:', error);
            req.flash('error_msg', 'Error al cargar la gestión de usuarios');
            res.redirect('/dashboard');
        }
    }
};

module.exports = dashboardController; 