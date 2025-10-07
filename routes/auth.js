const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/authController');
const { requireGuest, requireAuth } = require('../middlewares/auth');

// Validaciones para login
const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Debe ser un email válido')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('La contraseña es requerida')
        .isLength({ min: 1 })
        .withMessage('La contraseña no puede estar vacía')
];

// Validaciones para registro
const registerValidation = [
    body('first_name')
        .trim()
        .notEmpty()
        .withMessage('El nombre es requerido')
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),
    
    body('last_name')
        .trim()
        .notEmpty()
        .withMessage('El apellido es requerido')
        .isLength({ min: 2, max: 50 })
        .withMessage('El apellido debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El apellido solo puede contener letras y espacios'),
    
    body('email')
        .isEmail()
        .withMessage('Debe ser un email válido')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Las contraseñas no coinciden');
            }
            return true;
        }),
    
    body('dni')
        .trim()
        .notEmpty()
        .withMessage('El DNI es requerido')
        .isLength({ min: 7, max: 8 })
        .withMessage('El DNI debe tener entre 7 y 8 dígitos')
        .isNumeric()
        .withMessage('El DNI debe contener solo números'),
    
    body('curso')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('El curso no puede tener más de 50 caracteres'),
    
    body('role')
        .isIn(['student', 'profesor', 'admin'])
        .withMessage('Rol no válido')
];

// Validaciones para actualizar perfil
const profileValidation = [
    body('first_name')
        .trim()
        .notEmpty()
        .withMessage('El nombre es requerido')
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),
    
    body('last_name')
        .trim()
        .notEmpty()
        .withMessage('El apellido es requerido')
        .isLength({ min: 2, max: 50 })
        .withMessage('El apellido debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El apellido solo puede contener letras y espacios'),
    
    body('email')
        .isEmail()
        .withMessage('Debe ser un email válido')
        .normalizeEmail()
];

// Rutas de autenticación
router.get('/login', requireGuest, authController.showLogin);
router.post('/login', requireGuest, loginValidation, authController.processLogin);

router.get('/register', requireGuest, authController.showRegister);
router.post('/register', requireGuest, registerValidation, authController.processRegister);

router.get('/logout', requireAuth, authController.logout);

// Rutas de perfil
router.get('/profile', requireAuth, authController.showProfile);
router.post('/profile', requireAuth, profileValidation, authController.updateProfile);

module.exports = router; 