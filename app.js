const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
require('dotenv').config();

const app = express();

// Importar middlewares
const { addUserToLocals } = require('./middlewares/auth');

// Importar rutas
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

// Configuración del motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesiones
app.use(session({
    secret: 'tu_secreto_super_seguro_aqui_cambialo_en_produccion',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // true en producción con HTTPS
        maxAge: 1000 * 60 * 60 * 24 // 24 horas
    }
}));

// Flash messages
app.use(flash());

// Variables globales para templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.session.user || null;
    next();
});

// Middleware para añadir información del usuario a las vistas
app.use(addUserToLocals);

// Rutas
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Ruta principal
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('index', { title: 'Sistema de Gestión - Inicio' });
});

// Middleware de manejo de errores 404
app.use((req, res) => {
    res.status(404).render('errors/404', { title: 'Página no encontrada' });
});

// Middleware de manejo de errores del servidor
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('errors/500', { title: 'Error del servidor' });
});

module.exports = app; 