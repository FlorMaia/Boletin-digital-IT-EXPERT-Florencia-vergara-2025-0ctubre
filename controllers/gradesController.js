const { pool } = require('../config/database');
const GradesService = require('../services/gradesService');

class GradesController {
    /**
     * Guarda las calificaciones enviadas desde el front-end, valida permisos
     * y recalcula los promedios necesarios.
     */
    static async saveGrades(req, res) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            const { asignacion_id, updates } = req.body;
            if (!asignacion_id || !updates || !Array.isArray(updates)) {
                return res.status(400).json({ message: 'Datos inválidos para guardar calificaciones.' });
            }

            // 1. Obtener datos del profesor y de la asignación
            const [profesores] = await connection.query('SELECT id FROM profesores WHERE user_id = ?', [req.session.user.id]);
            if (profesores.length === 0) {
                return res.status(403).json({ message: 'Acceso denegado. Perfil de profesor no encontrado.' });
            }
            const profesor_id = profesores[0].id;

            const [asignaciones] = await connection.query(`
                SELECT a.subject_id, a.division_id, d.nivel_id, a.año_lectivo
                FROM asignaciones a
                JOIN divisiones d ON a.division_id = d.id
                WHERE a.id = ? AND a.profesor_id = ?
            `, [asignacion_id, profesor_id]);

            if (asignaciones.length === 0) {
                return res.status(403).json({ message: 'Acceso denegado. No tiene permisos sobre esta asignación.' });
            }
            const { subject_id, division_id, nivel_id, año_lectivo } = asignaciones[0];

            const updatedStudentIds = new Set();

            // 2. Procesar todas las actualizaciones de notas
            for (const update of updates) {
                if (!update.estudiante_id || !update.grade_type) continue;
                
                const gradeData = {
                    estudiante_id: update.estudiante_id,
                    profesor_id, subject_id, division_id, nivel_id, año_lectivo,
                    grade_type: update.grade_type,
                    grade: update.grade
                };
                await GradesService.upsertGrade(connection, gradeData);
                updatedStudentIds.add(update.estudiante_id);
            }

            // 3. Recalcular promedios para cada estudiante afectado (DESACTIVADO)
            /*
            for (const estudiante_id of updatedStudentIds) {
                const baseGradeData = {
                    estudiante_id, profesor_id, subject_id, division_id, nivel_id, año_lectivo
                };
                await GradesService.calculateAverages(connection, baseGradeData);
            }
            */

            await connection.commit();
            res.json({ message: 'Calificaciones guardadas exitosamente.' });

        } catch (error) {
            await connection.rollback();
            console.error('Error al guardar calificaciones:', error);
            res.status(500).json({ message: 'Error en el servidor al guardar las calificaciones.' });
        } finally {
            connection.release();
        }
    }
}

module.exports = GradesController; 