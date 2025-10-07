const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Configuración estática de la base de datos (temporal)
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bd',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

console.log('⚙️ Conectando a MySQL con configuración estática...');

// Crear el pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para conectar a MySQL sin especificar base de datos
async function connectToMySQL() {
    return mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password
    });
}

// Función para resetear completamente la base de datos
async function resetDatabase() {
    const connection = await connectToMySQL();
    
    try {
        console.log('🗑️  Eliminando base de datos existente...');
        await connection.execute(`DROP DATABASE IF EXISTS ${dbConfig.database}`);
        
        console.log('🏗️  Creando nueva base de datos...');
        await connection.execute(`CREATE DATABASE ${dbConfig.database}`);
        
        console.log('✅ Base de datos recreada exitosamente');
    } catch (error) {
        console.error('❌ Error al resetear la base de datos:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Función para crear todas las tablas
async function createTables() {
    const connection = await pool.getConnection();
    
    try {
        console.log('📋 Creando tablas...');
        
        // Tabla de usuarios
        await connection.execute(`
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                dni VARCHAR(20) NOT NULL,
                curso VARCHAR(50),
                role ENUM('student', 'profesor', 'admin') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        `);

        // Tabla de modalidades
        await connection.execute(`
            CREATE TABLE modalidades (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(50) NOT NULL UNIQUE,
                descripcion TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de niveles (grados)
        await connection.execute(`
            CREATE TABLE niveles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                modalidad_id INT NOT NULL,
                numero INT NOT NULL,
                nombre VARCHAR(50) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (modalidad_id) REFERENCES modalidades(id),
                UNIQUE KEY unique_nivel_modalidad (modalidad_id, numero)
            )
        `);

        // Tabla de divisiones (cursos 
        await connection.execute(`
            CREATE TABLE divisiones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nivel_id INT NOT NULL,
                division VARCHAR(10) NOT NULL,
                nombre_completo VARCHAR(100) NOT NULL,
                aula VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (nivel_id) REFERENCES niveles(id),
                UNIQUE KEY unique_division_nivel (nivel_id, division)
            )
        `);

        // Tabla de materias 
        await connection.execute(`
            CREATE TABLE subjects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                codigo VARCHAR(20) UNIQUE,
                description TEXT,
                modalidad_id INT,
                nivel_id INT,
                horas_semanales INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (modalidad_id) REFERENCES modalidades(id),
                FOREIGN KEY (nivel_id) REFERENCES niveles(id)
            )
        `);

        // Tabla de estudiantes 
        await connection.execute(`
            CREATE TABLE estudiantes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                division_id INT NOT NULL,
                legajo VARCHAR(50) UNIQUE,
                tutor_nombre VARCHAR(200),
                tutor_telefono VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (division_id) REFERENCES divisiones(id)
            )
        `);

        // Tabla de profesores 
        await connection.execute(`
            CREATE TABLE profesores (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                legajo VARCHAR(50) UNIQUE,
                titulo VARCHAR(200),
                especialidad VARCHAR(200),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Tabla de aulas
        await connection.execute(`
            CREATE TABLE classrooms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                capacity INT DEFAULT 30,
                location VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        `);

        // Tabla de cursos
        await connection.execute(`
            CREATE TABLE courses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                year INT NOT NULL,
                section VARCHAR(10),
                classroom_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
            )
        `);

        // Tabla de inscripciones de estudiantes
        await connection.execute(`
            CREATE TABLE student_courses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                course_id INT NOT NULL,
                enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (student_id) REFERENCES users(id),
                FOREIGN KEY (course_id) REFERENCES courses(id),
                UNIQUE KEY unique_student_course (student_id, course_id)
            )
        `);

        // Tabla de asignaciones profesor-materia-división
        await connection.execute(`
            CREATE TABLE asignaciones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                profesor_id INT NOT NULL,
                subject_id INT NOT NULL,
                division_id INT NOT NULL,
                año_lectivo YEAR NOT NULL DEFAULT (YEAR(CURDATE())),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (profesor_id) REFERENCES profesores(id),
                FOREIGN KEY (subject_id) REFERENCES subjects(id),
                FOREIGN KEY (division_id) REFERENCES divisiones(id),
                UNIQUE KEY unique_asignacion (profesor_id, subject_id, division_id, año_lectivo)
            )
        `);

        // Tabla de calificaciones 
        await connection.execute(`
            CREATE TABLE grades (
                id INT AUTO_INCREMENT PRIMARY KEY,
                estudiante_id INT NOT NULL,
                profesor_id INT NOT NULL,
                subject_id INT NOT NULL,
                division_id INT NOT NULL,
                nivel_id INT NOT NULL,
                año_lectivo YEAR NOT NULL DEFAULT (YEAR(CURDATE())),
                grade_type ENUM('informe1', 'informe2', 'cuatrimestre1', 'informe3', 'informe4', 'cuatrimestre2', 'final') NOT NULL,
                grade DECIMAL(4,2) NOT NULL,
                fecha_evaluacion DATE,
                comments TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
                FOREIGN KEY (profesor_id) REFERENCES profesores(id),
                FOREIGN KEY (subject_id) REFERENCES subjects(id),
                FOREIGN KEY (division_id) REFERENCES divisiones(id),
                FOREIGN KEY (nivel_id) REFERENCES niveles(id),
                UNIQUE KEY unique_calificacion (estudiante_id, profesor_id, subject_id, division_id, año_lectivo, grade_type)
            )
        `);

        console.log('✅ Todas las tablas creadas exitosamente');
        
    } catch (error) {
        console.error('❌ Error al crear tablas:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Función para insertar datos masivos de un colegio completo
async function insertSeedData() {
    const connection = await pool.getConnection();
    
    try {
        console.log('🌱 Insertando datos masivos del colegio...');
        
        const saltRounds = 10;
        
        // =============================================================
        // 1. USUARIO ADMINISTRADOR
        // =============================================================
        const adminPassword = await bcrypt.hash('admin123', saltRounds);
        await connection.execute(`
            INSERT INTO users (email, password, first_name, last_name, dni, curso, role) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, ['admin@colegioguevara.edu.ar', adminPassword, 'Carlos', 'López', '11223344', null, 'admin']);
        
        // =============================================================
        // 2. MODALIDADES Y ESTRUCTURA ACADÉMICA
        // =============================================================
        console.log('📚 Creando estructura académica...');
        
        // Insertar modalidades
        await connection.execute(`
            INSERT INTO modalidades (nombre, descripcion) VALUES 
            ('Bachiller', 'Modalidad de Bachillerato con orientación general'),
            ('Técnica', 'Modalidad Técnica con orientación en tecnología')
        `);

        // Insertar niveles para Bachiller (1° a 6°)
        for (let i = 1; i <= 6; i++) {
            await connection.execute(`
                INSERT INTO niveles (modalidad_id, numero, nombre) VALUES 
                (1, ?, ?)
            `, [i, `${i}° Año Bachiller`]);
        }

        // Insertar niveles para Técnica (1° a 7°)
        for (let i = 1; i <= 7; i++) {
            await connection.execute(`
                INSERT INTO niveles (modalidad_id, numero, nombre) VALUES 
                (2, ?, ?)
            `, [i, `${i}° Año Técnica`]);
        }

        // Insertar 4 divisiones por cada nivel
        const divisiones = ['1°', '2°', '3°', '4°'];
        
        // Divisiones para Bachiller (1° a 6° año)
        for (let nivel = 1; nivel <= 6; nivel++) {
            for (let div = 0; div < 4; div++) { // 4 divisiones por nivel
                await connection.execute(`
                    INSERT INTO divisiones (nivel_id, division, nombre_completo, aula) VALUES 
                    (?, ?, ?, ?)
                `, [nivel, divisiones[div], `${nivel}° ${divisiones[div]} Bachiller`, `Aula B${nivel}${div + 1}`]);
            }
        }

        // Divisiones para Técnica (1° a 7° año)
        for (let nivel = 7; nivel <= 13; nivel++) { // IDs 7-13 para técnica
            for (let div = 0; div < 4; div++) { // 4 divisiones por nivel
                await connection.execute(`
                    INSERT INTO divisiones (nivel_id, division, nombre_completo, aula) VALUES 
                    (?, ?, ?, ?)
                `, [nivel, divisiones[div], `${nivel - 6}° ${divisiones[div]} Técnica`, `Aula T${nivel - 6}${div + 1}`]);
            }
        }

        // =============================================================
        // 3. MATERIAS COMPLETAS
        // =============================================================
        console.log('📖 Creando materias...');
        
        // Materias comunes para todos los niveles de Bachiller
        for (let nivel = 1; nivel <= 6; nivel++) {
            // Materias comunes para todos los años
            await connection.execute(`
                INSERT INTO subjects (name, codigo, description, modalidad_id, nivel_id, horas_semanales) VALUES 
                ('Lengua y Literatura', CONCAT('LENG', ${nivel}), 'Comunicación y expresión escrita y oral', 1, ${nivel}, 4),
                ('Matemáticas', CONCAT('MAT', ${nivel}), 'Álgebra, geometría y análisis matemático', 1, ${nivel}, 5),
                ('Inglés', CONCAT('ING', ${nivel}), 'Idioma inglés', 1, ${nivel}, 3),
                ('Educación Física', CONCAT('EDF', ${nivel}), 'Actividad física y deportes', 1, ${nivel}, 2)
            `);
            
            // Materias específicas por ciclo
            if (nivel <= 3) {
                // Ciclo básico (1° a 3° año)
                await connection.execute(`
                    INSERT INTO subjects (name, codigo, description, modalidad_id, nivel_id, horas_semanales) VALUES 
                    ('Historia', CONCAT('HIST', ${nivel}), 'Historia argentina y universal', 1, ${nivel}, 3),
                    ('Geografía', CONCAT('GEO', ${nivel}), 'Geografía física y humana', 1, ${nivel}, 3),
                    ('Biología', CONCAT('BIO', ${nivel}), 'Ciencias biológicas y naturales', 1, ${nivel}, 3),
                    ('Arte', CONCAT('ART', ${nivel}), 'Educación artística y plástica', 1, ${nivel}, 2),
                    ('Música', CONCAT('MUS', ${nivel}), 'Educación musical', 1, ${nivel}, 2)
                `);
            } else {
                // Ciclo orientado (4° a 6° año)
                await connection.execute(`
                    INSERT INTO subjects (name, codigo, description, modalidad_id, nivel_id, horas_semanales) VALUES 
                    ('Historia', CONCAT('HIST', ${nivel}), 'Historia argentina y universal', 1, ${nivel}, 3),
                    ('Geografía', CONCAT('GEO', ${nivel}), 'Geografía física y humana', 1, ${nivel}, 3),
                    ('Física', CONCAT('FIS', ${nivel}), 'Física general y aplicada', 1, ${nivel}, 3),
                    ('Química', CONCAT('QUI', ${nivel}), 'Química general y orgánica', 1, ${nivel}, 3),
                    ('Filosofía', CONCAT('FIL', ${nivel}), 'Filosofía y ética', 1, ${nivel}, 2)
                `);
            }
        }
        
        // Materias específicas de Bachiller por nivel (ciclo orientado)
        await connection.execute(`
            INSERT INTO subjects (name, codigo, description, modalidad_id, nivel_id, horas_semanales) VALUES 
            ('Literatura Universal', 'LITUN', 'Literatura clásica y contemporánea', 1, 4, 3),
            ('Economía', 'ECO', 'Principios de economía', 1, 5, 4),
            ('Psicología', 'PSI', 'Psicología general', 1, 5, 3),
            ('Sociología', 'SOC', 'Sociología y ciencias sociales', 1, 6, 3)
        `);
        
        // Materias comunes para todos los niveles de Técnica
        for (let nivel = 7; nivel <= 13; nivel++) {
            // Materias comunes para todos los años
            await connection.execute(`
                INSERT INTO subjects (name, codigo, description, modalidad_id, nivel_id, horas_semanales) VALUES 
                ('Lengua y Literatura', CONCAT('LENG_TEC', ${nivel-6}), 'Comunicación y expresión escrita y oral', 2, ${nivel}, 4),
                ('Matemáticas', CONCAT('MAT_TEC', ${nivel-6}), 'Álgebra, geometría y análisis matemático', 2, ${nivel}, 5),
                ('Inglés', CONCAT('ING_TEC', ${nivel-6}), 'Idioma inglés', 2, ${nivel}, 3),
                ('Educación Física', CONCAT('EDF_TEC', ${nivel-6}), 'Actividad física y deportes', 2, ${nivel}, 2)
            `);
            
            // Materias específicas por ciclo
            if (nivel <= 9) {
                // Ciclo básico técnico (1° a 3° año)
                await connection.execute(`
                    INSERT INTO subjects (name, codigo, description, modalidad_id, nivel_id, horas_semanales) VALUES 
                    ('Historia', CONCAT('HIST_TEC', ${nivel-6}), 'Historia argentina y universal', 2, ${nivel}, 3),
                    ('Geografía', CONCAT('GEO_TEC', ${nivel-6}), 'Geografía física y humana', 2, ${nivel}, 3),
                    ('Biología', CONCAT('BIO_TEC', ${nivel-6}), 'Ciencias biológicas y naturales', 2, ${nivel}, 3),
                    ('Dibujo Técnico', CONCAT('DIBT_TEC', ${nivel-6}), 'Dibujo técnico y representación gráfica', 2, ${nivel}, 3)
                `);
            }
        }
        
        // Materias específicas de Técnica por nivel
        await connection.execute(`
            INSERT INTO subjects (name, codigo, description, modalidad_id, nivel_id, horas_semanales) VALUES 
            ('Física', 'FIS1', 'Física general y aplicada', 2, 9, 3),
            ('Química', 'QUI1', 'Química general y orgánica', 2, 9, 3),
            ('Programación I', 'PROG1', 'Fundamentos de programación', 2, 10, 6),
            ('Hardware', 'HARD', 'Componentes y mantenimiento de equipos', 2, 10, 4),
            ('Programación II', 'PROG2', 'Programación avanzada', 2, 11, 6),
            ('Base de Datos', 'BD', 'Diseño y gestión de bases de datos', 2, 11, 5),
            ('Redes', 'RED', 'Redes de computadoras y comunicaciones', 2, 11, 4),
            ('Sistemas Operativos', 'SO', 'Administración de sistemas operativos', 2, 12, 4),
            ('Análisis de Sistemas', 'AS', 'Análisis y diseño de sistemas', 2, 12, 5),
            ('Algoritmia', 'ALG', 'Algoritmos y estructuras de datos', 2, 12, 5),
            ('Electrónica', 'ELEC', 'Electrónica básica y digital', 2, 12, 4),
            ('Proyecto Final', 'PF', 'Proyecto integrador final', 2, 13, 8)
        `);

        // =============================================================
        // 4. PROFESORES MASIVOS (30 profesores)
        // =============================================================
        console.log('👨‍🏫 Creando profesores...');
        
        const teacherPassword = await bcrypt.hash('profesor123', saltRounds);
        const profesores = [
            // Profesores de Lengua y Literatura
            ['ana.garcia@colegioguevara.edu.ar', 'Ana', 'García', '20123456', 'Profesora de Lengua y Literatura'],
            ['carlos.martinez@colegioguevara.edu.ar', 'Carlos', 'Martínez', '20234567', 'Profesor de Lengua y Literatura'],
            
            // Profesores de Matemáticas
            ['lucia.rodriguez@colegioguevara.edu.ar', 'Lucía', 'Rodríguez', '20345678', 'Profesora de Matemáticas'],
            ['miguel.fernandez@colegioguevara.edu.ar', 'Miguel', 'Fernández', '20456789', 'Profesor de Matemáticas'],
            ['sofia.lopez@colegioguevara.edu.ar', 'Sofía', 'López', '20567890', 'Profesora de Matemáticas'],
            
            // Profesores de Historia
            ['diego.sanchez@colegioguevara.edu.ar', 'Diego', 'Sánchez', '20678901', 'Profesor de Historia'],
            ['valentina.torres@colegioguevara.edu.ar', 'Valentina', 'Torres', '20789012', 'Profesora de Historia'],
            
            // Profesores de Geografía
            ['matias.ruiz@colegioguevara.edu.ar', 'Matías', 'Ruiz', '20890123', 'Profesor de Geografía'],
            ['camila.morales@colegioguevara.edu.ar', 'Camila', 'Morales', '20901234', 'Profesora de Geografía'],
            
            // Profesores de Inglés
            ['nicolas.silva@colegioguevara.edu.ar', 'Nicolás', 'Silva', '21012345', 'Profesor de Inglés'],
            ['florencia.herrera@colegioguevara.edu.ar', 'Florencia', 'Herrera', '21123456', 'Profesora de Inglés'],
            
            // Profesores de Ciencias
            ['santiago.castro@colegioguevara.edu.ar', 'Santiago', 'Castro', '21234567', 'Profesor de Biología'],
            ['isabella.ramos@colegioguevara.edu.ar', 'Isabella', 'Ramos', '21345678', 'Profesora de Física'],
            ['francisco.vargas@colegioguevara.edu.ar', 'Francisco', 'Vargas', '21456789', 'Profesor de Química'],
            
            // Profesores de Arte y Educación Física
            ['martina.jimenez@colegioguevara.edu.ar', 'Martina', 'Jiménez', '21567890', 'Profesora de Arte'],
            ['leonardo.gutierrez@colegioguevara.edu.ar', 'Leonardo', 'Gutiérrez', '21678901', 'Profesor de Educación Física'],
            ['agustina.mendez@colegioguevara.edu.ar', 'Agustina', 'Méndez', '21789012', 'Profesora de Música'],
            
            // Profesores específicos de Técnica
            ['matias.fernandez@colegioguevara.edu.ar', 'Matías', 'Fernández', '21890123', 'Profesor de Programación'],
            ['julieta.perez@colegioguevara.edu.ar', 'Julieta', 'Pérez', '21901234', 'Profesora de Base de Datos'],
            ['benjamin.gonzalez@colegioguevara.edu.ar', 'Benjamín', 'González', '22012345', 'Profesor de Redes'],
            ['catalina.alvarez@colegioguevara.edu.ar', 'Catalina', 'Álvarez', '22123456', 'Profesora de Hardware'],
            ['joaquin.romero@colegioguevara.edu.ar', 'Joaquín', 'Romero', '22234567', 'Profesor de Sistemas Operativos'],
            ['antonella.iglesias@colegioguevara.edu.ar', 'Antonella', 'Iglesias', '22345678', 'Profesora de Análisis de Sistemas'],
            ['thiago.medina@colegioguevara.edu.ar', 'Thiago', 'Medina', '22456789', 'Profesor de Electrónica'],
            
            // Profesores adicionales
            ['esperanza.ortiz@colegioguevara.edu.ar', 'Esperanza', 'Ortiz', '22567890', 'Profesora de Filosofía'],
            ['emiliano.diaz@colegioguevara.edu.ar', 'Emiliano', 'Díaz', '22678901', 'Profesor de Economía'],
            ['renata.vega@colegioguevara.edu.ar', 'Renata', 'Vega', '22789012', 'Profesora de Psicología'],
            ['gael.moreno@colegioguevara.edu.ar', 'Gael', 'Moreno', '22890123', 'Profesor de Sociología'],
            ['mia.aguilar@colegioguevara.edu.ar', 'Mía', 'Aguilar', '22901234', 'Profesora de Literatura Universal'],
            ['lautaro.flores@colegioguevara.edu.ar', 'Lautaro', 'Flores', '23012345', 'Profesor de Algoritmia'],
            ['alma.reyes@colegioguevara.edu.ar', 'Alma', 'Reyes', '23123456', 'Profesora de Proyecto Final']
        ];

        for (const [email, firstName, lastName, dni, titulo] of profesores) {
            // Insertar usuario
            const [result] = await connection.execute(`
                INSERT INTO users (email, password, first_name, last_name, dni, role) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [email, teacherPassword, firstName, lastName, dni, 'profesor']);
            
            // Insertar información de profesor
            await connection.execute(`
                INSERT INTO profesores (user_id, legajo, titulo) VALUES 
                (?, ?, ?)
            `, [result.insertId, `PROF${String(result.insertId).padStart(4, '0')}`, titulo]);
        }

        // =============================================================
        // 5. ESTUDIANTES MASIVOS (20 estudiantes por división)
        // =============================================================
        console.log('👨‍🎓 Creando estudiantes...');
        
        const studentPassword = await bcrypt.hash('estudiante123', saltRounds);
        
        // Nombres y apellidos para generar estudiantes
        const nombres = [
            'Florencia', 'Mario', 'Yuliana', 'Abril', 'Valentina', 'Mikaela', 'Tomás', 'Antonio',
            'Santiago', 'Mariano', 'Lucía', 'Diego', 'Camila', 'Nicolás', 'Sofía', 'Matías',
            'Isabella', 'Francisco', 'Martina', 'Leonardo', 'Agustina', 'Benjamín', 'Catalina',
            'Joaquín', 'Antonella', 'Thiago', 'Renata', 'Emiliano', 'Mía', 'Lautaro', 'Alma',
            'Guadalupe', 'Bautista', 'Delfina', 'Gaspar', 'Pilar', 'Félix', 'Clara', 'Máximo'
        ];
        
        const apellidos = [
            'García', 'Rodríguez', 'González', 'López', 'Martínez', 'Pérez', 'Sánchez', 'Ramírez',
            'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Reyes', 'Cruz', 'Morales', 'Ortiz',
            'Gutiérrez', 'Ruiz', 'Hernández', 'Jiménez', 'Álvarez', 'Medina', 'Castro', 'Vargas',
            'Romero', 'Suárez', 'Herrera', 'Mendoza', 'Silva', 'Ramos', 'Moreno', 'Iglesias'
        ];

        let estudianteCounter = 1;
        let dniCounter = 30000000;

        // Generar estudiantes para cada división (52 divisiones total)
        for (let divisionId = 1; divisionId <= 52; divisionId++) {
            for (let i = 0; i < 20; i++) { // 20 estudiantes por división
                const nombre = nombres[Math.floor(Math.random() * nombres.length)];
                const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];
                const email = `${nombre.toLowerCase()}.${apellido.toLowerCase()}${estudianteCounter}@colegioguevara.edu.ar`;
                const dni = String(dniCounter++);
                
                // Insertar usuario
                const [result] = await connection.execute(`
                    INSERT INTO users (email, password, first_name, last_name, dni, role) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [email, studentPassword, nombre, apellido, dni, 'student']);
                
                // Insertar información de estudiante
                await connection.execute(`
                    INSERT INTO estudiantes (user_id, division_id, legajo, tutor_nombre, tutor_telefono) VALUES 
                    (?, ?, ?, ?, ?)
                `, [result.insertId, divisionId, `EST${String(result.insertId).padStart(4, '0')}`, `${apellido}, Tutor de ${nombre}`, `11-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`]);
                
                estudianteCounter++;
            }
        }

        // =============================================================
        // 6. ASIGNACIONES PROFESOR-MATERIA-DIVISIÓN
        // =============================================================
        console.log('🔗 Creando asignaciones...');
        
        // Mapeo de profesores por materia (usando IDs de profesor)
        const profesoresPorMateria = {
            1: [1, 2], // Lengua y Literatura
            2: [3, 4, 5], // Matemáticas  
            3: [6, 7], // Historia
            4: [8, 9], // Geografía
            5: [10, 11], // Inglés
            6: [16], // Educación Física
            7: [12], // Biología
            8: [13], // Física
            9: [14], // Química
            10: [15], // Arte
            11: [17], // Música
            12: [25], // Filosofía
            13: [17], // Literatura Universal (Bachiller)
            14: [26], // Economía (Bachiller)
            15: [27], // Psicología (Bachiller)
            16: [28], // Sociología (Bachiller)
            17: [18], // Programación I (Técnica)
            18: [18], // Programación II (Técnica)
            19: [19], // Base de Datos (Técnica)
            20: [20], // Redes (Técnica)
            21: [21], // Hardware (Técnica)
            22: [22], // Sistemas Operativos (Técnica)
            23: [23], // Análisis de Sistemas (Técnica)
            24: [30], // Proyecto Final (Técnica)
            25: [24], // Electrónica (Técnica)
            26: [29]  // Algoritmia (Técnica)
        };

        // Materias básicas para cada modalidad por nivel
        const materiasPorNivel = {
            // Bachiller (divisiones 1-24)
            'bachiller': {
                '1-2': [1, 2, 3, 4, 5, 6, 7, 10], // 1° y 2° año
                '3-4': [1, 2, 3, 4, 5, 6, 8, 9, 11], // 3° y 4° año
                '5-6': [1, 2, 3, 4, 5, 6, 12, 13, 14, 15, 16] // 5° y 6° año
            },
            // Técnica (divisiones 25-52)
            'tecnica': {
                '1-2': [1, 2, 3, 4, 5, 6, 7, 10], // 1° y 2° año
                '3-4': [1, 2, 5, 6, 8, 9, 17, 21, 25], // 3° y 4° año
                '5-6': [1, 2, 5, 18, 19, 20, 22, 26], // 5° y 6° año
                '7': [23, 24, 19, 20, 22] // 7° año
            }
        };

        // Crear asignaciones para Bachiller
        for (let nivel = 1; nivel <= 6; nivel++) {
            for (let div = 0; div < 4; div++) {
                const divisionId = (nivel - 1) * 4 + div + 1;
                let materias = [];
                
                if (nivel <= 2) materias = materiasPorNivel.bachiller['1-2'];
                else if (nivel <= 4) materias = materiasPorNivel.bachiller['3-4'];
                else materias = materiasPorNivel.bachiller['5-6'];
                
                for (const materiaId of materias) {
                    const profesoresDisponibles = profesoresPorMateria[materiaId];
                    const profesorId = profesoresDisponibles[Math.floor(Math.random() * profesoresDisponibles.length)];
                    
                    await connection.execute(`
                        INSERT INTO asignaciones (profesor_id, subject_id, division_id, año_lectivo) VALUES 
                        (?, ?, ?, 2024)
                    `, [profesorId, materiaId, divisionId]);
                }
            }
        }

        // Crear asignaciones para Técnica
        for (let nivel = 1; nivel <= 7; nivel++) {
            for (let div = 0; div < 4; div++) {
                const divisionId = 24 + (nivel - 1) * 4 + div + 1; // Empezar desde división 25
                let materias = [];
                
                if (nivel <= 2) materias = materiasPorNivel.tecnica['1-2'];
                else if (nivel <= 4) materias = materiasPorNivel.tecnica['3-4'];
                else if (nivel <= 6) materias = materiasPorNivel.tecnica['5-6'];
                else materias = materiasPorNivel.tecnica['7'];
                
                for (const materiaId of materias) {
                    if (profesoresPorMateria[materiaId]) {
                        const profesoresDisponibles = profesoresPorMateria[materiaId];
                        const profesorId = profesoresDisponibles[Math.floor(Math.random() * profesoresDisponibles.length)];
                        
                        await connection.execute(`
                            INSERT INTO asignaciones (profesor_id, subject_id, division_id, año_lectivo) VALUES 
                            (?, ?, ?, 2024)
                        `, [profesorId, materiaId, divisionId]);
                    }
                }
            }
        }

        // =============================================================
        // 7. CALIFICACIONES MASIVAS
        // =============================================================
        console.log('📊 Generando calificaciones...');
        
        // Obtener información de estudiantes, profesores, materias y divisiones
        const [estudiantes] = await connection.execute(`
            SELECT e.id as estudiante_id, e.division_id, d.nivel_id
            FROM estudiantes e
            INNER JOIN divisiones d ON e.division_id = d.id
        `);

        // Obtener profesores por materia y nivel
        const [profesoresMaterias] = await connection.execute(`
            SELECT DISTINCT p.id as profesor_id, s.id as subject_id, s.nivel_id, d.id as division_id
            FROM profesores p
            CROSS JOIN subjects s
            CROSS JOIN divisiones d
            WHERE d.nivel_id = s.nivel_id
            ORDER BY RAND()
            LIMIT 1000
        `);

        const tiposCalificacion = ['informe1', 'informe2', 'informe3', 'informe4'];
        const año_lectivo = 2024;
        
        // Generar calificaciones para cada estudiante en cada materia de su nivel
        for (const estudiante of estudiantes) {
            // Obtener materias para el nivel del estudiante
            const [materias] = await connection.execute(`
                SELECT s.id as subject_id, s.nivel_id
                FROM subjects s
                WHERE s.nivel_id = ?
            `, [estudiante.nivel_id]);
            
            // Para cada materia, asignar un profesor y generar calificaciones
            for (const materia of materias) {
                // Encontrar un profesor para esta materia
                const profesorMateria = profesoresMaterias.find(pm => 
                    pm.subject_id === materia.subject_id && 
                    pm.nivel_id === materia.nivel_id &&
                    pm.division_id === estudiante.division_id
                );
                
                // Si no hay profesor específico, tomar uno aleatorio
                const profesorId = profesorMateria ? profesorMateria.profesor_id : 
                    Math.floor(Math.random() * 30) + 1;
                
                // Generar 4 informes por estudiante-materia
                for (const tipo of tiposCalificacion) {
                    const nota = (Math.random() * 4 + 6).toFixed(1); // Notas entre 6.0 y 10.0
                    
                    await connection.execute(`
                        INSERT INTO grades (
                            estudiante_id, profesor_id, subject_id, division_id, nivel_id, 
                            año_lectivo, grade_type, grade, fecha_evaluacion
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 180) DAY))
                    `, [
                        estudiante.estudiante_id, 
                        profesorId, 
                        materia.subject_id, 
                        estudiante.division_id, 
                        estudiante.nivel_id,
                        año_lectivo,
                        tipo, 
                        parseFloat(nota)
                    ]);
                }
            }
        }

        // Calcular cuatrimestres y finales automáticamente
        console.log('🧮 Calculando promedios...');
        
        const [gradesToProcess] = await connection.execute(`
            SELECT estudiante_id, profesor_id, subject_id, division_id, nivel_id, año_lectivo,
                   AVG(CASE WHEN grade_type IN ('informe1', 'informe2') THEN grade END) as cuatr1,
                   AVG(CASE WHEN grade_type IN ('informe3', 'informe4') THEN grade END) as cuatr2
            FROM grades 
            WHERE grade_type IN ('informe1', 'informe2', 'informe3', 'informe4')
            GROUP BY estudiante_id, profesor_id, subject_id, division_id, nivel_id, año_lectivo
        `);

        for (const grade of gradesToProcess) {
            // Insertar cuatrimestre 1
            if (grade.cuatr1 && typeof grade.cuatr1 === 'number') {
                const cuatr1Value = parseFloat(grade.cuatr1.toFixed(1));
                await connection.execute(`
                    INSERT INTO grades (
                        estudiante_id, profesor_id, subject_id, division_id, nivel_id, 
                        año_lectivo, grade_type, grade, fecha_evaluacion
                    ) VALUES (?, ?, ?, ?, ?, ?, 'cuatrimestre1', ?, CURDATE())
                `, [
                    grade.estudiante_id, 
                    grade.profesor_id, 
                    grade.subject_id, 
                    grade.division_id, 
                    grade.nivel_id,
                    grade.año_lectivo,
                    cuatr1Value
                ]);
            }
            
            // Insertar cuatrimestre 2
            if (grade.cuatr2 && typeof grade.cuatr2 === 'number') {
                const cuatr2Value = parseFloat(grade.cuatr2.toFixed(1));
                await connection.execute(`
                    INSERT INTO grades (
                        estudiante_id, profesor_id, subject_id, division_id, nivel_id, 
                        año_lectivo, grade_type, grade, fecha_evaluacion
                    ) VALUES (?, ?, ?, ?, ?, ?, 'cuatrimestre2', ?, CURDATE())
                `, [
                    grade.estudiante_id, 
                    grade.profesor_id, 
                    grade.subject_id, 
                    grade.division_id, 
                    grade.nivel_id,
                    grade.año_lectivo,
                    cuatr2Value
                ]);
            }
            
            // Insertar nota final
            if (grade.cuatr1 && grade.cuatr2 && typeof grade.cuatr1 === 'number' && typeof grade.cuatr2 === 'number') {
                const finalValue = parseFloat(((grade.cuatr1 + grade.cuatr2) / 2).toFixed(1));
                await connection.execute(`
                    INSERT INTO grades (
                        estudiante_id, profesor_id, subject_id, division_id, nivel_id, 
                        año_lectivo, grade_type, grade, fecha_evaluacion
                    ) VALUES (?, ?, ?, ?, ?, ?, 'final', ?, CURDATE())
                `, [
                    grade.estudiante_id, 
                    grade.profesor_id, 
                    grade.subject_id, 
                    grade.division_id, 
                    grade.nivel_id,
                    grade.año_lectivo,
                    finalValue
                ]);
            }
        }

        // =============================================================
        // 8. AULAS Y CURSOS ADICIONALES
        // =============================================================
        console.log('🏫 Creando aulas y cursos...');
        
        // Insertar aulas
        const aulas = [
            ['Aula 101', 35, 'Planta Baja - Ala Norte'],
            ['Aula 102', 35, 'Planta Baja - Ala Norte'],
            ['Aula 201', 30, 'Primer Piso - Ala Norte'],
            ['Aula 202', 30, 'Primer Piso - Ala Norte'],
            ['Laboratorio de Informática 1', 25, 'Primer Piso - Ala Sur'],
            ['Laboratorio de Informática 2', 25, 'Primer Piso - Ala Sur'],
            ['Laboratorio de Ciencias', 20, 'Segundo Piso - Ala Norte'],
            ['Aula Magna', 120, 'Planta Baja - Centro'],
            ['Gimnasio', 50, 'Edificio Deportivo'],
            ['Biblioteca', 40, 'Segundo Piso - Centro']
        ];

        for (const [nombre, capacidad, ubicacion] of aulas) {
            await connection.execute(`
                INSERT INTO classrooms (name, capacity, location) VALUES 
                (?, ?, ?)
            `, [nombre, capacidad, ubicacion]);
        }
        
        console.log('✅ ¡Datos masivos insertados exitosamente!');
        console.log('📊 RESUMEN DE DATOS CREADOS:');
        console.log('   👥 30 Profesores');
        console.log('   👨‍🎓 1,040 Estudiantes (20 por división)');
        console.log('   📚 26 Materias');
        console.log('   🏫 52 Divisiones (4 por grado)');
        console.log('   📋 Miles de asignaciones');
        console.log('   📊 Miles de calificaciones');
        
    } catch (error) {
        console.error('❌ Error al insertar datos masivos:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Función principal de migración
async function runMigration() {
    try {
        console.log('\n🚀 INICIANDO MIGRACIÓN COMPLETA DE BASE DE DATOS');
        console.log('================================================\n');
        
        await resetDatabase();
        await createTables();
        await insertSeedData();
        
        console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
        console.log('=====================================');
        console.log('👤 Usuarios creados:');
        console.log('   📧 admin@colegioguevara.edu.ar (Contraseña: admin123)');
        console.log('   📧 profesor@colegioguevara.edu.ar (Contraseña: profesor123)');
        console.log('   📧 estudiante@colegioguevara.edu.ar (Contraseña: estudiante123)');
        console.log('=====================================\n');
        
    } catch (error) {
        console.error('💥 Error en la migración:', error);
        process.exit(1);
    }
}

// Función de inicialización (para compatibilidad con el código existente)
async function initializeDatabase() {
    try {
        console.log('⚙️ Conectando a MySQL con configuración estática...');
        console.log('Inicializando base de datos...');
        
        // Verificar si la base de datos existe
        const connection = await connectToMySQL();
        const [databases] = await connection.execute(`SHOW DATABASES LIKE '${dbConfig.database}'`);
        await connection.end();
        
        if (databases.length === 0) {
            console.log('📦 Base de datos no existe, ejecutando migración completa...');
            await runMigration();
        } else {
            console.log('✅ Base de datos ya existe');
        }
        
        console.log('✅ Base de datos inicializada correctamente');
        
    } catch (error) {
        console.error('❌ Error al inicializar la base de datos:', error);
        throw error;
    }
}

// Función para obtener una conexión
async function getConnection() {
    try {
        return await pool.getConnection();
    } catch (error) {
        console.error('Error al obtener conexión:', error);
        throw error;
    }
}

module.exports = {
    pool,
    initializeDatabase,
    runMigration
}; 