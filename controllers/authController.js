const { validationResult } = require('express-validator');
const User = require('../models/User');

const authController = {
    // Mostrar página de login
    showLogin: (req, res) => {
        if (req.session.user) {
            return res.redirect('/dashboard');
        }
        res.render('auth/login', { 
            title: 'Iniciar Sesión',
            email: ''
        });
    },

    // Procesar login
    processLogin: async (req, res) => {
        try {
            const errors = validationResult(req);
            
            if (!errors.isEmpty()) {
                return res.render('auth/login', {
                    title: 'Iniciar Sesión',
                    email: req.body.email,
                    errors: errors.array()
                });
            }

            const { email, password } = req.body;

            // Buscar usuario por email
            const user = await User.findByEmail(email);
            
            if (!user) {
                req.flash('error_msg', 'Credenciales inválidas');
                return res.render('auth/login', {
                    title: 'Iniciar Sesión',
                    email: email
                });
            }

            // Verificar contraseña
            const isMatch = await user.comparePassword(password);
            
            if (!isMatch) {
                req.flash('error_msg', 'Credenciales inválidas');
                return res.render('auth/login', {
                    title: 'Iniciar Sesión',
                    email: email
                });
            }

            // Crear sesión
            req.session.user = {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            };

            req.flash('success_msg', `¡Bienvenido, ${user.getFullName()}!`);
            res.redirect('/dashboard');

        } catch (error) {
            console.error('Error en login:', error);
            req.flash('error_msg', 'Error interno del servidor');
            res.render('auth/login', {
                title: 'Iniciar Sesión',
                email: req.body.email || ''
            });
        }
    },

    // Mostrar página de registro
    showRegister: (req, res) => {
        if (req.session.user) {
            return res.redirect('/dashboard');
        }
        res.render('auth/register', { 
            title: 'Registro de Usuario',
            formData: {}
        });
    },

    // Procesar registro
    processRegister: async (req, res) => {
        try {
            const errors = validationResult(req);
            
            if (!errors.isEmpty()) {
                return res.render('auth/register', {
                    title: 'Registro de Usuario',
                    formData: req.body,
                    errors: errors.array()
                });
            }

            const { email, password, first_name, last_name, dni, curso, role } = req.body;

            // Verificar si el usuario ya existe
            const existingUser = await User.findByEmail(email);
            
            if (existingUser) {
                req.flash('error_msg', 'Ya existe un usuario con este email');
                return res.render('auth/register', {
                    title: 'Registro de Usuario',
                    formData: req.body
                });
            }

            // Crear nuevo usuario
            const userId = await User.create({
                email,
                password,
                first_name,
                last_name,
                dni,
                curso,
                role
            });

            req.flash('success_msg', 'Usuario registrado exitosamente. Ahora puedes iniciar sesión.');
            res.redirect('/login');

        } catch (error) {
            console.error('Error en registro:', error);
            req.flash('error_msg', 'Error interno del servidor');
            res.render('auth/register', {
                title: 'Registro de Usuario',
                formData: req.body
            });
        }
    },

    // Logout
    logout: (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error al cerrar sesión:', err);
                req.flash('error_msg', 'Error al cerrar sesión');
                return res.redirect('/dashboard');
            }
            res.redirect('/');
        });
    },

    // Mostrar perfil de usuario
    showProfile: async (req, res) => {
        try {
            const user = await User.findById(req.session.user.id);
            
            if (!user) {
                req.flash('error_msg', 'Usuario no encontrado');
                return res.redirect('/dashboard');
            }

            res.render('auth/profile', {
                title: 'Mi Perfil',
                user: user
            });

        } catch (error) {
            console.error('Error al cargar perfil:', error);
            req.flash('error_msg', 'Error al cargar el perfil');
            res.redirect('/dashboard');
        }
    },

    // Actualizar perfil
    updateProfile: async (req, res) => {
        try {
            const errors = validationResult(req);
            
            if (!errors.isEmpty()) {
                const user = await User.findById(req.session.user.id);
                return res.render('auth/profile', {
                    title: 'Mi Perfil',
                    user: user,
                    errors: errors.array()
                });
            }

            const user = await User.findById(req.session.user.id);
            
            if (!user) {
                req.flash('error_msg', 'Usuario no encontrado');
                return res.redirect('/dashboard');
            }

            // Actualizar datos
            await user.update(req.body);
            
            // Actualizar sesión
            req.session.user.first_name = req.body.first_name;
            req.session.user.last_name = req.body.last_name;
            req.session.user.email = req.body.email;

            req.flash('success_msg', 'Perfil actualizado correctamente');
            res.redirect('/profile');

        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            req.flash('error_msg', 'Error al actualizar el perfil');
            res.redirect('/profile');
        }
    }
};

module.exports = authController; 