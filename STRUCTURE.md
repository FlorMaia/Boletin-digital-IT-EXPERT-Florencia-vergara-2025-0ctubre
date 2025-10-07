# 📁 Estructura del Proyecto - API Escalable

## 🏗️ Nueva Arquitectura

La API ha sido refactorizada para ser más escalable y mantenible. Aquí tienes la nueva estructura:

### 📋 Controladores (`/controllers`)
Los controladores manejan la lógica de negocio de cada endpoint:

- **`gradesController.js`** - Maneja toda la lógica relacionada con notas/calificaciones
- **`usersController.js`** - Maneja toda la lógica relacionada con usuarios

### 🔧 Servicios (`/services`)
Los servicios contienen la lógica de negocio pura y funciones reutilizables:

- **`gradesService.js`** - Cálculos de promedios, operaciones complejas de notas

### 🛣️ Rutas (`/routes`)
Las rutas están organizadas por dominio:

- **`api.js`** - Router principal que agrupa todas las rutas de API
- **`grades.js`** - Rutas específicas para notas (/api/grades/*)
- **`users.js`** - Rutas específicas para usuarios (/api/users/*)

## 🎯 Ventajas de esta estructura

1. **Separación de responsabilidades**: Cada archivo tiene una responsabilidad específica
2. **Escalabilidad**: Es fácil agregar nuevos dominios (materias, cursos, etc.)
3. **Mantenibilidad**: El código está organizado y es fácil de encontrar
4. **Reutilización**: Los servicios pueden ser reutilizados en diferentes controladores
5. **Testing**: Es más fácil hacer tests unitarios de cada componente

## 🚀 Cómo agregar nuevas funcionalidades

### Para agregar un nuevo dominio (ej: "subjects"):

1. **Crear el controlador**: `controllers/subjectsController.js`
2. **Crear el servicio** (si es necesario): `services/subjectsService.js`
3. **Crear las rutas**: `routes/subjects.js`
4. **Registrar en api.js**: `router.use('/subjects', subjectsRoutes);`

### Ejemplo de un nuevo controlador:

```javascript
// controllers/subjectsController.js
const { pool } = require('../config/database');

class SubjectsController {
    static async getAllSubjects(req, res) {
        try {
            // Tu lógica aquí
            res.json(subjects);
        } catch (error) {
            res.status(500).json({ error: 'Error al obtener materias' });
        }
    }
}

module.exports = SubjectsController;
```

## 📱 Endpoints actuales

### Notas (Grades)
- `GET /api/grades/:subjectId` - Obtener notas de una materia
- `POST /api/grades` - Guardar/actualizar notas

### Usuarios (Users)
- `DELETE /api/users/:userId` - Eliminar usuario (solo admins)

## 🔄 Migración desde la estructura anterior

La funcionalidad se mantiene exactamente igual, solo cambió la organización interna. Todos los endpoints siguen funcionando con las mismas URLs. 




la base de datos es relacional y es una a muchas

created_at  signifca a que hora y fecha fue creado tanto el usuario  etc