# Sistema de Gestión Educativa

## 📋 Descripción
Sistema completo de gestión educativa desarrollado con Express.js, EJS y MySQL. Permite gestionar estudiantes, profesores, materias, notas y más.

## 🚀 Características
- ✅ Sistema de autenticación completo (login/registro)
- ✅ Roles de usuario: Administrador, Profesor, Estudiante
- ✅ Dashboard personalizado por rol
- ✅ Gestión de usuarios
- ✅ Interfaz moderna con Bootstrap 5
- ✅ Base de datos MySQL con tablas relacionales
- ✅ Validaciones de formularios
- ✅ Seguridad con bcrypt y sesiones

## 🛠️ Instalación

### Prerrequisitos
- Node.js (v14 o superior)
- MySQL (v8.0 o superior)
- MySQL Workbench (opcional, para administrar la BD)

### Configuración

1. **Crear archivo .env**
   Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=45432465
   DB_NAME=management_system
   DB_PORT=3306

   SESSION_SECRET=tu_secreto_super_seguro_aqui_cambialo_en_produccion

   PORT=3000
   ```

2. **Instalar nodemon para desarrollo (opcional)**
   ```bash
   npm install -g nodemon
   ```

3. **Iniciar el servidor**
   ```bash
   # Para desarrollo (con nodemon)
   npm run dev
   
   # Para producción
   npm start
   ```

## 📊 Base de Datos
El sistema creará automáticamente las siguientes tablas:
- `users` - Usuarios del sistema (estudiantes, profesores, admins)
- `subjects` - Materias/asignaturas
- `classrooms` - Aulas/salones
- `courses` - Cursos
- `student_courses` - Relación estudiante-curso
- `teacher_subjects` - Relación profesor-materia-curso
- `grades` - Calificaciones

## 👥 Usuarios por Defecto
Para crear el primer usuario administrador, visita:
`http://localhost:3000/register`

Y selecciona "Administrador" como tipo de usuario.

## 📱 Rutas Principales
- `/` - Página de inicio
- `/login` - Iniciar sesión
- `/register` - Registro de usuarios
- `/dashboard` - Panel principal (redirige según el rol)
- `/dashboard/admin` - Panel de administrador
- `/dashboard/teacher` - Panel de profesor
- `/dashboard/student` - Panel de estudiante
- `/profile` - Perfil de usuario

## 🎨 Tecnologías
- **Backend**: Express.js, Node.js
- **Frontend**: EJS, Bootstrap 5, Bootstrap Icons
- **Base de Datos**: MySQL
- **Autenticación**: bcryptjs, express-session
- **Validaciones**: express-validator
- **Variables de Entorno**: dotenv

## 📁 Estructura del Proyecto
```
proyecto/
├── config/
│   └── database.js          # Configuración de MySQL
├── controllers/
│   ├── authController.js    # Controlador de autenticación
│   └── dashboardController.js # Controlador del dashboard
├── middlewares/
│   └── auth.js              # Middlewares de autenticación
├── models/
│   └── User.js              # Modelo de usuario
├── routes/
│   ├── auth.js              # Rutas de autenticación
│   └── dashboard.js         # Rutas del dashboard
├── views/
│   ├── auth/                # Vistas de login/registro
│   ├── dashboard/           # Vistas del dashboard
│   ├── partials/            # Componentes reutilizables
│   ├── layout.ejs           # Layout principal
│   └── index.ejs            # Página de inicio
├── public/
│   ├── css/
│   │   └── style.css        # Estilos personalizados
│   └── js/
│       └── script.js        # JavaScript personalizado
├── app.js                   # Configuración de Express
├── server.js                # Servidor principal
└── package.json
```

