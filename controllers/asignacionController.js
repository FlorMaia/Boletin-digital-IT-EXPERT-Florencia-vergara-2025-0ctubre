const { pool } = require('../config/database');

class AsignacionController {
    /**
     * Obtiene la lista de estudiantes de una asignación específica,
     * verificando que el profesor tenga permisos.
     */
    static async getEstudiantesPorAsignacion(req, res) {
        const connection = await pool.getConnection();
        try {
            const { asignacionId } = req.params;
            const profesorUserId = req.session.user.id;

            // 1. Obtener el ID interno del profesor
            const [profesores] = await connection.query('SELECT id FROM profesores WHERE user_id = ?', [profesorUserId]);
            if (profesores.length === 0) {
                return res.status(403).json({ message: 'Acceso denegado. Perfil de profesor no encontrado.' });
            }
            const profesorId = profesores[0].id;
            
            // 2. Verificar que el profesor tiene acceso a la asignación y obtener el ID de la división
            const [asignaciones] = await connection.query('SELECT division_id FROM asignaciones WHERE id = ? AND profesor_id = ?', [asignacionId, profesorId]);
            if (asignaciones.length === 0) {
                return res.status(403).json({ message: 'Acceso denegado o asignación no encontrada.' });
            }
            const { division_id } = asignaciones[0];

            // 3. Obtener los estudiantes de esa división
            const [estudiantes] = await connection.query(`
                SELECT u.first_name, u.last_name, u.email, e.legajo, e.tutor_nombre, e.tutor_telefono
                FROM estudiantes e
                JOIN users u ON e.user_id = u.id
                WHERE e.division_id = ? AND u.is_active = TRUE
                ORDER BY u.last_name, u.first_name
            `, [division_id]);

            res.json(estudiantes);

        } catch (error) {
            console.error('Error al obtener estudiantes por asignación:', error);
            res.status(500).json({ message: 'Error en el servidor al obtener la lista de estudiantes.' });
        } finally {
            connection.release();
        }
    }
}

module.exports = AsignacionController; 