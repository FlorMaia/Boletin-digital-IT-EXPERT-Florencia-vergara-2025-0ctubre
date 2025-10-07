const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    constructor(userData) {
        this.id = userData.id;
        this.email = userData.email;
        this.password = userData.password;
        this.first_name = userData.first_name;
        this.last_name = userData.last_name;
        this.dni = userData.dni;
        this.curso = userData.curso;
        this.role = userData.role;
        this.is_active = userData.is_active;
        this.created_at = userData.created_at;
        this.updated_at = userData.updated_at;
    }

    // Crear un nuevo usuario
    static async create(userData) {
        try {
            const { email, password, first_name, last_name, dni, curso, role } = userData;
            
            // Encriptar la contraseña
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            const [result] = await pool.execute(
                'INSERT INTO users (email, password, first_name, last_name, dni, curso, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [email, hashedPassword, first_name, last_name, dni, curso, role]
            );
            
            const userId = result.insertId;
            
            // Crear registros específicos según el rol
            if (role === 'profesor') {
                const legajo = `PROF${String(userId).padStart(4, '0')}`;
                const titulo = 'Profesor';
                
                await pool.execute(
                    'INSERT INTO profesores (user_id, legajo, titulo) VALUES (?, ?, ?)',
                    [userId, legajo, titulo]
                );
            } else if (role === 'student') {
                // Para estudiantes, necesitamos asignar una división
                // Por ahora, asignamos a la primera división disponible
                const [divisiones] = await pool.execute(
                    'SELECT id FROM divisiones WHERE is_active = TRUE ORDER BY id LIMIT 1'
                );
                
                if (divisiones.length > 0) {
                    const legajo = `EST${String(userId).padStart(4, '0')}`;
                    const divisionId = divisiones[0].id;
                    
                    await pool.execute(
                        'INSERT INTO estudiantes (user_id, division_id, legajo) VALUES (?, ?, ?)',
                        [userId, divisionId, legajo]
                    );
                }
            }
            
            return userId;
        } catch (error) {
            throw error;
        }
    }

    // Buscar usuario por email
    static async findByEmail(email) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
                [email]
            );
            
            if (rows.length === 0) return null;
            
            return new User(rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Buscar usuario por ID
    static async findById(id) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
                [id]
            );
            
            if (rows.length === 0) return null;
            
            return new User(rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Validar contraseña
    async comparePassword(candidatePassword) {
        try {
            return await bcrypt.compare(candidatePassword, this.password);
        } catch (error) {
            throw error;
        }
    }

    // Obtener todos los estudiantes
    static async getStudents() {
        try {
            const [rows] = await pool.execute(
                'SELECT id, email, first_name, last_name, dni, curso, created_at FROM users WHERE role = "student" AND is_active = TRUE ORDER BY first_name, last_name'
            );
            
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // Obtener todos los profesores
    static async getProfesores() {
        try {
            const [rows] = await pool.execute(
                'SELECT id, email, first_name, last_name, dni, curso, created_at FROM users WHERE role = "profesor" AND is_active = TRUE ORDER BY first_name, last_name'
            );
            
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // Obtener todos los usuarios para administración
    static async getAllUsers() {
        try {
            const [rows] = await pool.execute(
                'SELECT id, email, first_name, last_name, dni, curso, role, created_at FROM users WHERE is_active = TRUE ORDER BY first_name, last_name'
            );
            
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // Actualizar usuario
    async update(updateData) {
        try {
            const { first_name, last_name, email } = updateData;
            
            await pool.execute(
                'UPDATE users SET first_name = ?, last_name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [first_name, last_name, email, this.id]
            );
            
            // Actualizar los datos del objeto actual
            this.first_name = first_name;
            this.last_name = last_name;
            this.email = email;
            
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Cambiar contraseña
    async changePassword(newPassword) {
        try {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            
            await pool.execute(
                'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [hashedPassword, this.id]
            );
            
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Desactivar usuario (soft delete)
    async deactivate() {
        try {
            await pool.execute(
                'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [this.id]
            );
            
            this.is_active = false;
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Obtener nombre completo
    getFullName() {
        return `${this.first_name} ${this.last_name}`;
    }

    // Verificar si es admin
    isAdmin() {
        return this.role === 'admin';
    }

    // Verificar si es profesor
    isTeacher() {
        return this.role === 'profesor';
    }

    // Verificar si es estudiante
    isStudent() {
        return this.role === 'student';
    }
}

module.exports = User; 