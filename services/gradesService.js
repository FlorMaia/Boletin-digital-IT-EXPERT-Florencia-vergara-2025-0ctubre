const { pool } = require('../config/database');

class GradesService {
    /**
     * Inserta o actualiza una calificación. Si la nota es nula, la elimina.
     * @param {object} connection - Conexión a la base de datos.
     * @param {object} gradeData - Datos de la calificación.
     */
    static async upsertGrade(connection, gradeData) {
        const {
            estudiante_id, profesor_id, subject_id, division_id, nivel_id, 
            año_lectivo, grade_type, grade
        } = gradeData;

        // Validar que la nota sea un número si no es nula
        const gradeValue = (grade !== null && grade !== '' && !isNaN(grade)) ? parseFloat(grade) : null;

        if (gradeValue === null) {
            // Eliminar la nota si es nula o inválida
            return connection.execute(`
                DELETE FROM grades 
                WHERE estudiante_id = ? AND profesor_id = ? AND subject_id = ? AND division_id = ? 
                AND año_lectivo = ? AND grade_type = ?
            `, [estudiante_id, profesor_id, subject_id, division_id, año_lectivo, grade_type]);
        } else {
            // Insertar o actualizar la nota
            return connection.execute(`
                INSERT INTO grades (estudiante_id, profesor_id, subject_id, division_id, nivel_id, año_lectivo, grade_type, grade, fecha_evaluacion)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
                ON DUPLICATE KEY UPDATE
                grade = VALUES(grade),
                profesor_id = VALUES(profesor_id),
                fecha_evaluacion = CURDATE(),
                updated_at = CURRENT_TIMESTAMP
            `, [estudiante_id, profesor_id, subject_id, division_id, nivel_id, año_lectivo, grade_type, gradeValue]);
        }
    }

    /**
     * Calcula y actualiza los promedios (cuatrimestrales y final) para un estudiante.
     * @param {object} connection - Conexión a la base de datos.
     * @param {object} baseGradeData - Datos base de la calificación (IDs, año, etc.).
     */
    static async calculateAverages(connection, baseGradeData) {
        const { estudiante_id, subject_id, año_lectivo } = baseGradeData;

        // 1. Obtener todas las notas de informes para el estudiante
        const [informes] = await connection.execute(`
            SELECT grade_type, grade FROM grades
            WHERE estudiante_id = ? AND subject_id = ? AND año_lectivo = ? 
            AND grade_type IN ('informe1', 'informe2', 'informe3', 'informe4')
        `, [estudiante_id, subject_id, año_lectivo]);

        const allGrades = informes.reduce((acc, curr) => {
            acc[curr.grade_type] = parseFloat(curr.grade);
            return acc;
        }, {});

        // 2. Calcular y guardar promedio del 1er cuatrimestre
        let cuatr1 = null;
        if (allGrades.informe1 && allGrades.informe2) {
            cuatr1 = parseFloat(((allGrades.informe1 + allGrades.informe2) / 2).toFixed(2));
        }
        await this.upsertGrade(connection, { ...baseGradeData, grade_type: 'cuatrimestre1', grade: cuatr1 });

        // 3. Calcular y guardar promedio del 2do cuatrimestre
        let cuatr2 = null;
        if (allGrades.informe3 && allGrades.informe4) {
            cuatr2 = parseFloat(((allGrades.informe3 + allGrades.informe4) / 2).toFixed(2));
        }
        await this.upsertGrade(connection, { ...baseGradeData, grade_type: 'cuatrimestre2', grade: cuatr2 });

        // 4. Calcular y guardar nota final
        let final = null;
        if (cuatr1 !== null && cuatr2 !== null) {
            final = parseFloat(((cuatr1 + cuatr2) / 2).toFixed(2));
        }
        await this.upsertGrade(connection, { ...baseGradeData, grade_type: 'final', grade: final });
    }
}

module.exports = GradesService; 