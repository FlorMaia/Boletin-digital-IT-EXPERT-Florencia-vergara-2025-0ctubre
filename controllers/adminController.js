const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class AdminController {
    // =============================================
    // DASHBOARD PRINCIPAL
    // =============================================
    static async getDashboard(req, res) {
        try {
            const connection = await pool.getConnection();
            
            // Estadísticas generales
            const [stats] = await connection.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_usuarios,
                    (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = TRUE) as total_estudiantes,
                    (SELECT COUNT(*) FROM users WHERE role = 'profesor' AND is_active = TRUE) as total_profesores,
                    (SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = TRUE) as total_admins,
                    (SELECT COUNT(*) FROM modalidades WHERE is_active = TRUE) as total_modalidades,
                    (SELECT COUNT(*) FROM niveles WHERE is_active = TRUE) as total_niveles,
                    (SELECT COUNT(*) FROM divisiones WHERE is_active = TRUE) as total_divisiones,
                    (SELECT COUNT(*) FROM subjects WHERE is_active = TRUE) as total_materias,
                    (SELECT COUNT(*) FROM asignaciones WHERE is_active = TRUE) as total_asignaciones
            `);

            // Estadísticas por modalidad
            const [statsByModalidad] = await connection.execute(`
                SELECT 
                    m.nombre as modalidad,
                    COUNT(DISTINCT d.id) as total_divisiones,
                    COUNT(DISTINCT e.id) as total_estudiantes
                FROM modalidades m
                LEFT JOIN niveles n ON m.id = n.modalidad_id
                LEFT JOIN divisiones d ON n.id = d.nivel_id
                LEFT JOIN estudiantes e ON d.id = e.division_id
                WHERE m.is_active = TRUE
                GROUP BY m.id, m.nombre
            `);

            // Últimos usuarios registrados
            const [recentUsers] = await connection.execute(`
                SELECT id, first_name, last_name, email, role, created_at 
                FROM users 
                WHERE is_active = TRUE 
                ORDER BY created_at DESC 
                LIMIT 5
            `);

            connection.release();

            res.render('dashboard/admin', {
                title: 'Dashboard Administrador',
                stats: stats[0],
                statsByModalidad,
                recentUsers,
                activeTab: 'dashboard'
            });

        } catch (error) {
            console.error('Error en dashboard admin:', error);
            res.status(500).render('errors/500', { title: 'Error del servidor' });
        }
    }

    // =============================================
    // GESTIÓN DE USUARIOS
    // =============================================
    static async getUsers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;
            const search = req.query.search?.trim() || '';
            const roleFilter = req.query.role?.trim() || '';

            const connection = await pool.getConnection();

            // SOLUCIÓN DEFINITIVA: Construir consulta completa sin parámetros preparados problemáticos
            let whereConditions = ['u.is_active = 1'];
            
            // Escapar valores para evitar SQL injection
            if (search) {
                const escapedSearch = connection.escape(`%${search}%`);
                whereConditions.push(`(u.first_name LIKE ${escapedSearch} OR u.last_name LIKE ${escapedSearch} OR u.email LIKE ${escapedSearch} OR u.dni LIKE ${escapedSearch})`);
            }

            if (roleFilter) {
                const escapedRole = connection.escape(roleFilter);
                whereConditions.push(`u.role = ${escapedRole}`);
            }

            const whereClause = whereConditions.join(' AND ');

            // Consultas completas sin parámetros preparados
            const usersQuery = `
                SELECT u.id, u.email, u.first_name, u.last_name, u.dni, u.role, u.curso, u.created_at
                FROM users u
                WHERE ${whereClause}
                ORDER BY u.created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `;

            const countQuery = `
                SELECT COUNT(*) as total 
                FROM users u 
                WHERE ${whereClause}
            `;

            console.log('Users Query:', usersQuery);
            console.log('Count Query:', countQuery);

            // Ejecutar consultas sin parámetros
            const [usuarios] = await connection.query(usersQuery);
            const [totalCount] = await connection.query(countQuery);

            const total = parseInt(totalCount[0].total);
            const totalPages = Math.ceil(total / limit);

            connection.release();

            res.json({
                usuarios,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalUsers: total,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            });

        } catch (error) {
            console.error('Error obteniendo usuarios:', error);
            console.error('SQL Error:', error.sql);
            console.error('Error code:', error.code);
            res.status(500).json({ 
                error: 'Error al obtener usuarios',
                details: error.message 
            });
        }
    }

    // =============================================
    // GESTIÓN ACADÉMICA
    // =============================================
    static async getModalidades(req, res) {
        try {
            const connection = await pool.getConnection();
            
            const [modalidades] = await connection.execute(`
                SELECT m.*, 
                       COUNT(DISTINCT n.id) as total_niveles,
                       COUNT(DISTINCT d.id) as total_divisiones,
                       COUNT(DISTINCT e.id) as total_estudiantes
                FROM modalidades m
                LEFT JOIN niveles n ON m.id = n.modalidad_id
                LEFT JOIN divisiones d ON n.id = d.nivel_id  
                LEFT JOIN estudiantes e ON d.id = e.division_id
                WHERE m.is_active = TRUE
                GROUP BY m.id
                ORDER BY m.nombre
            `);

            connection.release();
            res.json(modalidades);

        } catch (error) {
            console.error('Error obteniendo modalidades:', error);
            res.status(500).json({ error: 'Error al obtener modalidades' });
        }
    }

    static async getNiveles(req, res) {
        try {
            const modalidadId = req.query.modalidad_id;
            const connection = await pool.getConnection();
            
            let query = `
                SELECT n.*, m.nombre as modalidad_nombre,
                       COUNT(DISTINCT d.id) as total_divisiones,
                       COUNT(DISTINCT e.id) as total_estudiantes
                FROM niveles n
                JOIN modalidades m ON n.modalidad_id = m.id
                LEFT JOIN divisiones d ON n.id = d.nivel_id
                LEFT JOIN estudiantes e ON d.id = e.division_id
                WHERE n.is_active = TRUE
            `;
            
            let params = [];
            if (modalidadId) {
                query += ` AND n.modalidad_id = ?`;
                params.push(modalidadId);
            }
            
            query += ` GROUP BY n.id ORDER BY m.nombre, n.numero`;

            const [niveles] = await connection.execute(query, params);

            connection.release();
            res.json(niveles);

        } catch (error) {
            console.error('Error obteniendo niveles:', error);
            res.status(500).json({ error: 'Error al obtener niveles' });
        }
    }

    static async getDivisiones(req, res) {
        try {
            const nivelId = req.query.nivel_id;
            const connection = await pool.getConnection();
            
            let query = `
                SELECT d.*, n.nombre as nivel_nombre, m.nombre as modalidad_nombre,
                       COUNT(DISTINCT e.id) as total_estudiantes
                FROM divisiones d
                JOIN niveles n ON d.nivel_id = n.id
                JOIN modalidades m ON n.modalidad_id = m.id
                LEFT JOIN estudiantes e ON d.id = e.division_id
                WHERE d.is_active = TRUE
            `;
            
            let params = [];
            if (nivelId) {
                query += ` AND d.nivel_id = ?`;
                params.push(nivelId);
            }
            
            query += ` GROUP BY d.id ORDER BY m.nombre, n.numero, d.division`;

            const [divisiones] = await connection.execute(query, params);

            connection.release();
            res.json(divisiones);

        } catch (error) {
            console.error('Error obteniendo divisiones:', error);
            res.status(500).json({ error: 'Error al obtener divisiones' });
        }
    }

    // =============================================
    // GESTIÓN DE MATERIAS
    // =============================================
    static async getMaterias(req, res) {
        try {
            const modalidadId = req.query.modalidad_id;
            
            const connection = await pool.getConnection();
            
            let query = `
                SELECT s.*, m.nombre as modalidad_nombre,
                       COUNT(DISTINCT a.id) as total_asignaciones,
                       COUNT(DISTINCT a.profesor_id) as total_profesores
                FROM subjects s
                LEFT JOIN modalidades m ON s.modalidad_id = m.id
                LEFT JOIN asignaciones a ON s.id = a.subject_id AND a.is_active = TRUE
                WHERE s.is_active = TRUE
            `;
            
            const params = [];
            
            if (modalidadId) {
                query += ' AND s.modalidad_id = ?';
                params.push(modalidadId);
            }
            
            query += `
                GROUP BY s.id
                ORDER BY m.nombre, s.name
            `;
            
            const [materias] = await connection.execute(query, params);

            connection.release();
            res.json(materias);

        } catch (error) {
            console.error('Error obteniendo materias:', error);
            res.status(500).json({ error: 'Error al obtener materias' });
        }
    }
    
    static async getMateria(req, res) {
        try {
            const { id } = req.params;
            const connection = await pool.getConnection();
            
            const [materias] = await connection.execute(`
                SELECT s.*, m.nombre as modalidad_nombre
                FROM subjects s
                LEFT JOIN modalidades m ON s.modalidad_id = m.id
                WHERE s.id = ? AND s.is_active = TRUE
            `, [id]);

            connection.release();

            if (materias.length === 0) {
                return res.status(404).json({ error: 'Materia no encontrada' });
            }

            res.json(materias[0]);

        } catch (error) {
            console.error('Error obteniendo materia:', error);
            res.status(500).json({ error: 'Error al obtener materia' });
        }
    }
    
    static async getMateriasPorNivel(req, res) {
        try {
            const { nivelId } = req.params;
            
            const connection = await pool.getConnection();
            
            // Primero obtener información del nivel para contexto
            const [niveles] = await connection.execute(`
                SELECT n.*, m.nombre as modalidad_nombre
                FROM niveles n
                JOIN modalidades m ON n.modalidad_id = m.id
                WHERE n.id = ? AND n.is_active = TRUE
            `, [nivelId]);
            
            if (niveles.length === 0) {
                connection.release();
                return res.status(404).json({ error: 'Nivel no encontrado' });
            }
            
            const nivel = niveles[0];
            
            // Obtener materias asociadas a la modalidad de este nivel
            // o materias sin modalidad específica (comunes a todas las modalidades)
            const [materias] = await connection.execute(`
                SELECT s.*, 
                       COUNT(DISTINCT a.id) as total_asignaciones,
                       COUNT(DISTINCT a.profesor_id) as total_profesores
                FROM subjects s
                LEFT JOIN asignaciones a ON s.id = a.subject_id AND a.is_active = TRUE
                WHERE (s.modalidad_id IS NULL OR s.modalidad_id = ?) AND s.is_active = TRUE
                GROUP BY s.id
                ORDER BY s.name
            `, [nivel.modalidad_id]);
            
            connection.release();
            
            res.json({
                nivel: {
                    id: nivel.id,
                    nombre: nivel.nombre,
                    numero: nivel.numero,
                    modalidad_id: nivel.modalidad_id,
                    modalidad_nombre: nivel.modalidad_nombre
                },
                materias
            });

        } catch (error) {
            console.error('Error obteniendo materias por nivel:', error);
            res.status(500).json({ error: 'Error al obtener materias por nivel' });
        }
    }
    
    static async createMateria(req, res) {
        try {
            const { name, description, codigo, modalidad_id, horas_semanales } = req.body;
            
            if (!name) {
                return res.status(400).json({ error: 'El nombre es obligatorio' });
            }
            
            const connection = await pool.getConnection();
            
            // Verificar si ya existe una materia con ese nombre
            const [existing] = await connection.execute(
                'SELECT id FROM subjects WHERE name = ? AND is_active = TRUE', 
                [name]
            );
            
            if (existing.length > 0) {
                connection.release();
                return res.status(400).json({ error: 'Ya existe una materia con ese nombre' });
            }
            
            // Insertar materia
            const [result] = await connection.execute(`
                INSERT INTO subjects (name, description, codigo, modalidad_id, horas_semanales) 
                VALUES (?, ?, ?, ?, ?)
            `, [name, description || '', codigo || '', modalidad_id || null, horas_semanales || 0]);
            
            connection.release();
            
            res.json({ 
                success: true, 
                message: 'Materia creada exitosamente',
                id: result.insertId 
            });

        } catch (error) {
            console.error('Error creando materia:', error);
            res.status(500).json({ error: 'Error al crear materia' });
        }
    }
    
    static async updateMateria(req, res) {
        try {
            const { id } = req.params;
            const { name, description, codigo, modalidad_id, horas_semanales } = req.body;
            
            if (!name) {
                return res.status(400).json({ error: 'El nombre es obligatorio' });
            }
            
            const connection = await pool.getConnection();
            
            // Verificar si ya existe otra materia con ese nombre
            const [existing] = await connection.execute(
                'SELECT id FROM subjects WHERE name = ? AND id != ? AND is_active = TRUE', 
                [name, id]
            );
            
            if (existing.length > 0) {
                connection.release();
                return res.status(400).json({ error: 'Ya existe otra materia con ese nombre' });
            }
            
            // Actualizar materia
            const [result] = await connection.execute(`
                UPDATE subjects
                SET name = ?, description = ?, codigo = ?, modalidad_id = ?, horas_semanales = ?
                WHERE id = ? AND is_active = TRUE
            `, [name, description || '', codigo || '', modalidad_id || null, horas_semanales || 0, id]);
            
            connection.release();
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Materia no encontrada' });
            }
            
            res.json({ 
                success: true, 
                message: 'Materia actualizada exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando materia:', error);
            res.status(500).json({ error: 'Error al actualizar materia' });
        }
    }
    
    static async deleteMateria(req, res) {
        try {
            const { id } = req.params;
            
            const connection = await pool.getConnection();
            
            // Verificar si tiene asignaciones asociadas
            const [asignaciones] = await connection.execute(
                'SELECT COUNT(*) as count FROM asignaciones WHERE subject_id = ? AND is_active = TRUE',
                [id]
            );
            
            if (asignaciones[0].count > 0) {
                connection.release();
                return res.status(400).json({ 
                    error: 'No se puede eliminar la materia porque tiene asignaciones asociadas' 
                });
            }
            
            // Marcar como inactivo
            await connection.execute(`
                UPDATE subjects 
                SET is_active = FALSE
                WHERE id = ?
            `, [id]);
            
            connection.release();
            
            res.json({ success: true, message: 'Materia eliminada exitosamente' });
            
        } catch (error) {
            console.error('Error eliminando materia:', error);
            res.status(500).json({ error: 'Error al eliminar materia' });
        }
    }

    // =============================================
    // GESTIÓN DE ASIGNACIONES
    // =============================================
    static async getAsignaciones(req, res) {
        try {
            const connection = await pool.getConnection();
            
            const [asignaciones] = await connection.execute(`
                SELECT a.*, 
                       CONCAT(u.first_name, ' ', u.last_name) as profesor_nombre,
                       s.name as materia_nombre,
                       d.nombre_completo as division_nombre,
                       n.nombre as nivel_nombre,
                       m.nombre as modalidad_nombre
                FROM asignaciones a
                JOIN profesores p ON a.profesor_id = p.id
                JOIN users u ON p.user_id = u.id
                JOIN subjects s ON a.subject_id = s.id
                JOIN divisiones d ON a.division_id = d.id
                JOIN niveles n ON d.nivel_id = n.id
                JOIN modalidades m ON n.modalidad_id = m.id
                WHERE a.is_active = TRUE
                ORDER BY m.nombre, n.numero, d.division, s.name
            `);

            connection.release();
            res.json(asignaciones);

        } catch (error) {
            console.error('Error obteniendo asignaciones:', error);
            res.status(500).json({ error: 'Error al obtener asignaciones' });
        }
    }

    // =============================================
    // CRUD ESTRUCTURA ACADÉMICA
    // =============================================
    
    // ESTADÍSTICAS DE ESTRUCTURA
    static async getEstructuraStats(req, res) {
        try {
            const connection = await pool.getConnection();
            
            const [stats] = await connection.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM modalidades WHERE is_active = TRUE) as total_modalidades,
                    (SELECT COUNT(*) FROM niveles WHERE is_active = TRUE) as total_niveles,
                    (SELECT COUNT(*) FROM divisiones WHERE is_active = TRUE) as total_divisiones,
                    (SELECT COUNT(DISTINCT e.id) FROM estudiantes e 
                     JOIN divisiones d ON e.division_id = d.id WHERE d.is_active = TRUE) as total_estudiantes
            `);

            connection.release();
            res.json(stats[0]);

        } catch (error) {
            console.error('Error obteniendo estadísticas de estructura:', error);
            res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
    }

    // JERARQUÍA COMPLETA
    static async getJerarquia(req, res) {
        try {
            const connection = await pool.getConnection();
            
            const [modalidades] = await connection.execute(`
                SELECT m.id, m.nombre, m.descripcion
                FROM modalidades m
                WHERE m.is_active = TRUE
                ORDER BY m.nombre
            `);

            // Para cada modalidad, obtener sus niveles y divisiones
            for (let modalidad of modalidades) {
                const [niveles] = await connection.execute(`
                    SELECT n.id, n.nombre, n.numero
                    FROM niveles n
                    WHERE n.modalidad_id = ? AND n.is_active = TRUE
                    ORDER BY n.numero
                `, [modalidad.id]);

                // Para cada nivel, obtener sus divisiones
                for (let nivel of niveles) {
                    const [divisiones] = await connection.execute(`
                        SELECT d.division, 
                               COUNT(e.id) as total_estudiantes
                        FROM divisiones d
                        LEFT JOIN estudiantes e ON d.id = e.division_id
                        WHERE d.nivel_id = ? AND d.is_active = TRUE
                        GROUP BY d.id, d.division
                        ORDER BY d.division
                    `, [nivel.id]);

                    nivel.divisiones = divisiones;
                }

                modalidad.niveles = niveles;
            }

            connection.release();
            res.json(modalidades);

        } catch (error) {
            console.error('Error obteniendo jerarquía:', error);
            res.status(500).json({ error: 'Error al obtener jerarquía' });
        }
    }

    // MODALIDADES CRUD
    static async getModalidad(req, res) {
        try {
            const { id } = req.params;
            const connection = await pool.getConnection();
            
            const [modalidades] = await connection.execute(
                'SELECT * FROM modalidades WHERE id = ? AND is_active = TRUE',
                [id]
            );

            connection.release();

            if (modalidades.length === 0) {
                return res.status(404).json({ error: 'Modalidad no encontrada' });
            }

            res.json(modalidades[0]);

        } catch (error) {
            console.error('Error obteniendo modalidad:', error);
            res.status(500).json({ error: 'Error al obtener modalidad' });
        }
    }

    static async createModalidad(req, res) {
        try {
            const { nombre, descripcion } = req.body;
            
            const connection = await pool.getConnection();
            
            // Verificar si ya existe una modalidad con ese nombre
            const [existing] = await connection.execute(
                'SELECT id FROM modalidades WHERE nombre = ? AND is_active = TRUE', 
                [nombre]
            );
            
            if (existing.length > 0) {
                connection.release();
                return res.status(400).json({ error: 'Ya existe una modalidad con ese nombre' });
            }
            
            // Insertar modalidad
            const [result] = await connection.execute(`
                INSERT INTO modalidades (nombre, descripcion) 
                VALUES (?, ?)
            `, [nombre, descripcion || '']);
            
            connection.release();
            
            res.json({ 
                success: true, 
                message: 'Modalidad creada exitosamente',
                id: result.insertId 
            });

        } catch (error) {
            console.error('Error creando modalidad:', error);
            res.status(500).json({ error: 'Error al crear modalidad' });
        }
    }

    static async updateModalidad(req, res) {
        try {
            const { id } = req.params;
            const { nombre, descripcion } = req.body;
            
            const connection = await pool.getConnection();
            
            // Verificar si ya existe otra modalidad con ese nombre
            const [existing] = await connection.execute(
                'SELECT id FROM modalidades WHERE nombre = ? AND id != ? AND is_active = TRUE', 
                [nombre, id]
            );
            
            if (existing.length > 0) {
                connection.release();
                return res.status(400).json({ error: 'Ya existe otra modalidad con ese nombre' });
            }
            
            await connection.execute(`
                UPDATE modalidades 
                SET nombre = ?, descripcion = ?
                WHERE id = ?
            `, [nombre, descripcion || '', id]);
            
            connection.release();
            
            res.json({ success: true, message: 'Modalidad actualizada exitosamente' });

        } catch (error) {
            console.error('Error actualizando modalidad:', error);
            res.status(500).json({ error: 'Error al actualizar modalidad' });
        }
    }

    static async deleteModalidad(req, res) {
        try {
            const { id } = req.params;
            
            const connection = await pool.getConnection();
            
            // Iniciar transacción para garantizar integridad
            await connection.beginTransaction();
            
            try {
                console.log(`🗑️ Iniciando eliminación en cascada de modalidad ID: ${id}`);
                
                // 1. Obtener todos los niveles asociados a esta modalidad
                const [niveles] = await connection.execute(
                    'SELECT id FROM niveles WHERE modalidad_id = ? AND is_active = TRUE',
                    [id]
                );
                
                const nivelesIds = niveles.map(nivel => nivel.id);
                console.log(`📋 Niveles asociados a eliminar: ${nivelesIds.length > 0 ? nivelesIds.join(', ') : 'ninguno'}`);
                
                // 2. Si hay niveles, obtener todas las divisiones asociadas a esos niveles
                let divisionesIds = [];
                if (nivelesIds.length > 0) {
                    // Crear placeholders para la consulta IN (?, ?, ...)
                    const placeholders = nivelesIds.map(() => '?').join(',');
                    
                    const [divisiones] = await connection.execute(
                        `SELECT id FROM divisiones WHERE nivel_id IN (${placeholders}) AND is_active = TRUE`,
                        [...nivelesIds]
                    );
                    
                    divisionesIds = divisiones.map(division => division.id);
                    console.log(`📋 Divisiones asociadas a eliminar: ${divisionesIds.length > 0 ? divisionesIds.join(', ') : 'ninguna'}`);
                }
                
                // 3. Desactivar divisiones asociadas
                if (divisionesIds.length > 0) {
                    // Crear placeholders para la consulta IN (?, ?, ...)
                    const placeholders = divisionesIds.map(() => '?').join(',');
                    
                    const [resultDivisiones] = await connection.execute(
                        `UPDATE divisiones SET is_active = FALSE WHERE id IN (${placeholders})`,
                        [...divisionesIds]
                    );
                    
                    console.log(`✅ Divisiones desactivadas: ${resultDivisiones.affectedRows}`);
                }
                
                // 4. Desactivar niveles asociados
                if (nivelesIds.length > 0) {
                    // Crear placeholders para la consulta IN (?, ?, ...)
                    const placeholders = nivelesIds.map(() => '?').join(',');
                    
                    const [resultNiveles] = await connection.execute(
                        `UPDATE niveles SET is_active = FALSE WHERE id IN (${placeholders})`,
                        [...nivelesIds]
                    );
                    
                    console.log(`✅ Niveles desactivados: ${resultNiveles.affectedRows}`);
                }
                
                // 5. Finalmente, desactivar la modalidad
                const [resultModalidad] = await connection.execute(
                    `UPDATE modalidades SET is_active = FALSE WHERE id = ?`,
                    [id]
                );
                
                console.log(`✅ Modalidad desactivada: ${resultModalidad.affectedRows}`);
                
                // Confirmar transacción
                await connection.commit();
                
                // Preparar respuesta con estadísticas
                const respuesta = {
                    success: true,
                    message: 'Modalidad eliminada exitosamente',
                    stats: {
                        modalidades: resultModalidad.affectedRows,
                        niveles: nivelesIds.length,
                        divisiones: divisionesIds.length
                    }
                };
                
                res.json(respuesta);
                
            } catch (error) {
                // Revertir transacción en caso de error
                await connection.rollback();
                throw error; // Relanzar para el manejo global
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Error eliminando modalidad:', error);
            res.status(500).json({ error: 'Error al eliminar modalidad' });
        }
    }

    // NIVELES CRUD
    static async getNivel(req, res) {
        try {
            const { id } = req.params;
            const connection = await pool.getConnection();
            
            const [niveles] = await connection.execute(`
                SELECT n.*, m.nombre as modalidad_nombre
                FROM niveles n
                JOIN modalidades m ON n.modalidad_id = m.id
                WHERE n.id = ? AND n.is_active = TRUE
            `, [id]);

            connection.release();

            if (niveles.length === 0) {
                return res.status(404).json({ error: 'Nivel no encontrado' });
            }

            res.json(niveles[0]);

        } catch (error) {
            console.error('Error obteniendo nivel:', error);
            res.status(500).json({ error: 'Error al obtener nivel' });
        }
    }

    static async createNivel(req, res) {
        try {
            const { modalidad_id, numero, nombre } = req.body;
            
            const connection = await pool.getConnection();
            
            // Verificar si ya existe un nivel con ese número para esa modalidad
            const [existing] = await connection.execute(
                'SELECT id FROM niveles WHERE modalidad_id = ? AND numero = ? AND is_active = TRUE', 
                [modalidad_id, numero]
            );
            
            if (existing.length > 0) {
                connection.release();
                return res.status(400).json({ error: 'Ya existe un nivel con ese número para esta modalidad' });
            }
            
            // Insertar nivel
            const [result] = await connection.execute(`
                INSERT INTO niveles (modalidad_id, numero, nombre) 
                VALUES (?, ?, ?)
            `, [modalidad_id, numero, nombre]);
            
            connection.release();
            
            res.json({ 
                success: true, 
                message: 'Nivel creado exitosamente',
                id: result.insertId 
            });

        } catch (error) {
            console.error('Error creando nivel:', error);
            res.status(500).json({ error: 'Error al crear nivel' });
        }
    }

    static async updateNivel(req, res) {
        try {
            console.log('🔄 updateNivel - Iniciando...');
            console.log('📊 Parámetros:', req.params);
            console.log('📊 Body:', req.body);
            
            const { id } = req.params;
            const { modalidad_id, numero, nombre } = req.body;
            
            // Validación de datos
            if (!modalidad_id || !numero || !nombre) {
                console.log('❌ Datos faltantes:', { modalidad_id, numero, nombre });
                return res.status(400).json({ error: 'Todos los campos son obligatorios' });
            }
            
            console.log('📡 Obteniendo conexión a base de datos...');
            const connection = await pool.getConnection();
            
            console.log('🔍 Verificando nivel existente...');
            // Verificar si ya existe otro nivel con ese número para esa modalidad
            const [existing] = await connection.execute(
                'SELECT id FROM niveles WHERE modalidad_id = ? AND numero = ? AND id != ? AND is_active = TRUE', 
                [modalidad_id, numero, id]
            );
            
            if (existing.length > 0) {
                console.log('⚠️ Ya existe otro nivel con ese número');
                connection.release();
                return res.status(400).json({ error: 'Ya existe otro nivel con ese número para esta modalidad' });
            }
            
            console.log('💾 Actualizando nivel en base de datos...');
            const updateResult = await connection.execute(`
                UPDATE niveles 
                SET modalidad_id = ?, numero = ?, nombre = ?
                WHERE id = ? AND is_active = TRUE
            `, [modalidad_id, numero, nombre, id]);
            
            console.log('📊 Resultado actualización:', updateResult[0]);
            
            connection.release();
            
            if (updateResult[0].affectedRows === 0) {
                console.log('❌ No se encontró el nivel para actualizar');
                return res.status(404).json({ error: 'Nivel no encontrado' });
            }
            
            console.log('✅ Nivel actualizado exitosamente');
            res.json({ success: true, message: 'Nivel actualizado exitosamente' });

        } catch (error) {
            console.error('❌ Error actualizando nivel:', error);
            console.error('❌ Stack trace:', error.stack);
            res.status(500).json({ 
                error: 'Error al actualizar nivel',
                details: error.message 
            });
        }
    }

    static async deleteNivel(req, res) {
        try {
            const { id } = req.params;
            
            const connection = await pool.getConnection();
            
            // Iniciar transacción para garantizar integridad
            await connection.beginTransaction();
            
            try {
                console.log(`🗑️ Iniciando eliminación en cascada de nivel ID: ${id}`);
                
                // 1. Obtener todas las divisiones asociadas a este nivel
                const [divisiones] = await connection.execute(
                    'SELECT id FROM divisiones WHERE nivel_id = ? AND is_active = TRUE',
                    [id]
                );
                
                const divisionesIds = divisiones.map(division => division.id);
                console.log(`📋 Divisiones asociadas a eliminar: ${divisionesIds.length > 0 ? divisionesIds.join(', ') : 'ninguna'}`);
                
                // 2. Desactivar divisiones asociadas
                if (divisionesIds.length > 0) {
                    // Crear placeholders para la consulta IN (?, ?, ...)
                    const placeholders = divisionesIds.map(() => '?').join(',');
                    
                    const [resultDivisiones] = await connection.execute(
                        `UPDATE divisiones SET is_active = FALSE WHERE id IN (${placeholders})`,
                        [...divisionesIds]
                    );
                    
                    console.log(`✅ Divisiones desactivadas: ${resultDivisiones.affectedRows}`);
                }
                
                // 3. Finalmente, desactivar el nivel
                const [resultNivel] = await connection.execute(
                    `UPDATE niveles SET is_active = FALSE WHERE id = ?`,
                    [id]
                );
                
                console.log(`✅ Nivel desactivado: ${resultNivel.affectedRows}`);
                
                // Confirmar transacción
                await connection.commit();
                
                // Preparar respuesta con estadísticas
                const respuesta = {
                    success: true,
                    message: 'Nivel eliminado exitosamente',
                    stats: {
                        niveles: resultNivel.affectedRows,
                        divisiones: divisionesIds.length
                    }
                };
                
                res.json(respuesta);
                
            } catch (error) {
                // Revertir transacción en caso de error
                await connection.rollback();
                throw error; // Relanzar para el manejo global
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Error eliminando nivel:', error);
            res.status(500).json({ error: 'Error al eliminar nivel' });
        }
    }

    // DIVISIONES CRUD
    static async getDivision(req, res) {
        try {
            const { id } = req.params;
            const connection = await pool.getConnection();
            
            const [divisiones] = await connection.execute(`
                SELECT d.*, n.nombre as nivel_nombre, m.nombre as modalidad_nombre
                FROM divisiones d
                JOIN niveles n ON d.nivel_id = n.id
                JOIN modalidades m ON n.modalidad_id = m.id
                WHERE d.id = ? AND d.is_active = TRUE
            `, [id]);

            connection.release();

            if (divisiones.length === 0) {
                return res.status(404).json({ error: 'División no encontrada' });
            }

            res.json(divisiones[0]);

        } catch (error) {
            console.error('Error obteniendo división:', error);
            res.status(500).json({ error: 'Error al obtener división' });
        }
    }

    static async createDivision(req, res) {
        try {
            const { nivel_id, division, aula } = req.body;
            
            const connection = await pool.getConnection();
            
            // Verificar si ya existe una división con esa letra para ese nivel
            const [existing] = await connection.execute(
                'SELECT id FROM divisiones WHERE nivel_id = ? AND division = ? AND is_active = TRUE', 
                [nivel_id, division]
            );
            
            if (existing.length > 0) {
                connection.release();
                return res.status(400).json({ error: 'Ya existe una división con esa letra para este nivel' });
            }

            // Obtener info del nivel para generar nombre completo
            const [nivelInfo] = await connection.execute(`
                SELECT n.nombre as nivel_nombre
                FROM niveles n
                WHERE n.id = ?
            `, [nivel_id]);

            const nombreCompleto = `${nivelInfo[0].nivel_nombre} "${division}"`;
            
            // Insertar división
            const [result] = await connection.execute(`
                INSERT INTO divisiones (nivel_id, division, aula, nombre_completo) 
                VALUES (?, ?, ?, ?)
            `, [nivel_id, division, aula || '', nombreCompleto]);
            
            connection.release();
            
            res.json({ 
                success: true, 
                message: 'División creada exitosamente',
                id: result.insertId 
            });

        } catch (error) {
            console.error('Error creando división:', error);
            res.status(500).json({ error: 'Error al crear división' });
        }
    }

    static async updateDivision(req, res) {
        try {
            const { id } = req.params;
            const { nivel_id, division, aula } = req.body;
            
            const connection = await pool.getConnection();
            
            // Verificar si ya existe otra división con esa letra para ese nivel
            const [existing] = await connection.execute(
                'SELECT id FROM divisiones WHERE nivel_id = ? AND division = ? AND id != ? AND is_active = TRUE', 
                [nivel_id, division, id]
            );
            
            if (existing.length > 0) {
                connection.release();
                return res.status(400).json({ error: 'Ya existe otra división con esa letra para este nivel' });
            }

            // Obtener info del nivel para actualizar nombre completo
            const [nivelInfo] = await connection.execute(`
                SELECT n.nombre as nivel_nombre
                FROM niveles n
                WHERE n.id = ?
            `, [nivel_id]);

            const nombreCompleto = `${nivelInfo[0].nivel_nombre} "${division}"`;
            
            await connection.execute(`
                UPDATE divisiones 
                SET nivel_id = ?, division = ?, aula = ?, nombre_completo = ?
                WHERE id = ?
            `, [nivel_id, division, aula || '', nombreCompleto, id]);
            
            connection.release();
            
            res.json({ success: true, message: 'División actualizada exitosamente' });

        } catch (error) {
            console.error('Error actualizando división:', error);
            res.status(500).json({ error: 'Error al actualizar división' });
        }
    }

    static async deleteDivision(req, res) {
        try {
            const { id } = req.params;
            
            const connection = await pool.getConnection();
            
            // Verificar si tiene estudiantes asociados
            const [estudiantes] = await connection.execute(
                'SELECT COUNT(*) as count FROM estudiantes WHERE division_id = ?',
                [id]
            );
            
            if (estudiantes[0].count > 0) {
                connection.release();
                return res.status(400).json({ 
                    error: 'No se puede eliminar la división porque tiene estudiantes asociados' 
                });
            }
            
            // Marcar como inactivo
            await connection.execute(`
                UPDATE divisiones 
                SET is_active = FALSE
                WHERE id = ?
            `, [id]);
            
            connection.release();
            
            res.json({ success: true, message: 'División eliminada exitosamente' });
            
        } catch (error) {
            console.error('Error eliminando división:', error);
            res.status(500).json({ error: 'Error al eliminar división' });
        }
    }

    // =============================================
    // CREAR/EDITAR/ELIMINAR USUARIOS
    // =============================================
    // =============================================
    // OBTENER ESTADÍSTICAS TOTALES
    // =============================================
    static async getStats(req, res) {
        try {
            const connection = await pool.getConnection();
            
            const [stats] = await connection.execute(`
                SELECT 
                    COUNT(*) as total_usuarios,
                    SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as total_estudiantes,
                    SUM(CASE WHEN role = 'profesor' THEN 1 ELSE 0 END) as total_profesores,
                    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as total_admins
                FROM users 
                WHERE is_active = TRUE
            `);

            connection.release();
            res.json(stats[0]);

        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
    }

    // =============================================
    // OBTENER USUARIO INDIVIDUAL
    // =============================================
    static async getUser(req, res) {
        try {
            const { userId } = req.params;
            const connection = await pool.getConnection();
            
            const [users] = await connection.execute(
                'SELECT id, email, first_name, last_name, dni, role, curso FROM users WHERE id = ? AND is_active = TRUE',
                [userId]
            );

            connection.release();

            if (users.length === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            res.json(users[0]);

        } catch (error) {
            console.error('Error obteniendo usuario:', error);
            res.status(500).json({ error: 'Error al obtener usuario' });
        }
    }

    static async createUser(req, res) {
        try {
            const { email, password, firstName, lastName, dni, role, curso } = req.body;
            
            const connection = await pool.getConnection();
            
            // Verificar si el email ya existe
            const [existingUser] = await connection.execute(
                'SELECT id FROM users WHERE email = ?', [email]
            );
            
            if (existingUser.length > 0) {
                connection.release();
                return res.status(400).json({ error: 'El email ya está registrado' });
            }
            
            // Hashear contraseña
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Insertar usuario
            const [result] = await connection.execute(`
                INSERT INTO users (email, password, first_name, last_name, dni, role, curso) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [email, hashedPassword, firstName, lastName, dni, role, curso]);
            
            // Si el rol es profesor, crear registro en la tabla profesores
            if (role === 'profesor') {
                const userId = result.insertId;
                const legajo = `PROF${userId}`;
                const titulo = 'Profesor';
                
                await connection.execute(`
                    INSERT INTO profesores (user_id, legajo, titulo) 
                    VALUES (?, ?, ?)
                `, [userId, legajo, titulo]);
            }
            
            connection.release();
            
            res.json({ 
                success: true, 
                message: 'Usuario creado exitosamente',
                userId: result.insertId 
            });

        } catch (error) {
            console.error('Error creando usuario:', error);
            res.status(500).json({ error: 'Error al crear usuario' });
        }
    }

    static async updateUser(req, res) {
        try {
            const { userId } = req.params;
            const { email, firstName, lastName, dni, role, curso, password } = req.body;
            
            const connection = await pool.getConnection();
            
            // Verificar si el email ya está en uso por otro usuario
            const [existingUser] = await connection.execute(
                'SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]
            );
            
            if (existingUser.length > 0) {
                connection.release();
                return res.status(400).json({ error: 'El email ya está en uso por otro usuario' });
            }

            let updateQuery, updateParams;
            
            if (password && password.trim() !== '') {
                // Actualizar con nueva contraseña
                const hashedPassword = await bcrypt.hash(password, 10);
                updateQuery = `
                    UPDATE users 
                    SET email = ?, password = ?, first_name = ?, last_name = ?, dni = ?, role = ?, curso = ?
                    WHERE id = ?
                `;
                updateParams = [email, hashedPassword, firstName, lastName, dni, role, curso, userId];
            } else {
                // Actualizar sin cambiar contraseña
                updateQuery = `
                    UPDATE users 
                    SET email = ?, first_name = ?, last_name = ?, dni = ?, role = ?, curso = ?
                    WHERE id = ?
                `;
                updateParams = [email, firstName, lastName, dni, role, curso, userId];
            }
            
            await connection.execute(updateQuery, updateParams);
            
            connection.release();
            
            res.json({ success: true, message: 'Usuario actualizado exitosamente' });

        } catch (error) {
            console.error('Error actualizando usuario:', error);
            res.status(500).json({ error: 'Error al actualizar usuario' });
        }
    }

    static async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            
            // Verificar que no se elimine a sí mismo
            if (parseInt(userId) === req.session.user.id) {
                return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
            }
            
            const connection = await pool.getConnection();
            
            // Marcar como inactivo en lugar de eliminar físicamente
            await connection.execute(`
                UPDATE users 
                SET is_active = FALSE
                WHERE id = ?
            `, [userId]);
            
            connection.release();
            
            res.json({ success: true, message: 'Usuario eliminado exitosamente' });
            
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            res.status(500).json({ error: 'Error al eliminar usuario' });
        }
    }
}

module.exports = AdminController;