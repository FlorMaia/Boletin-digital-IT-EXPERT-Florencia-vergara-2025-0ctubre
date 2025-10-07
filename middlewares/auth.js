// Middleware para verificar si el usuario está autenticado
const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    } else {
        req.flash('error_msg', 'Debes iniciar sesión para acceder a esta página');
        return res.redirect('/login');
    }
};

// Middleware para verificar si el usuario NO está autenticado (para páginas como login/register)
const requireGuest = (req, res, next) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    } else {
        return next();
    }
};

// Middleware para verificar roles específicos
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            // Si es una petición AJAX/fetch, responde con JSON
            if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                return res.status(401).json({ error: 'Debes iniciar sesión para acceder a esta página' });
            }
            req.flash('error_msg', 'Debes iniciar sesión para acceder a esta página');
            return res.redirect('/login');
        }

        // Si roles es un string, convertirlo a array
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        if (allowedRoles.includes(req.session.user.role)) {
            return next();
        } else {
            // Si es una petición AJAX/fetch, responde con JSON
            if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                return res.status(403).json({ error: 'No tienes permisos para acceder a esta página' });
            }
            req.flash('error_msg', 'No tienes permisos para acceder a esta página');
            return res.redirect('/dashboard');
        }
    };
};

// Middleware específicos para cada rol
const requireAdmin = requireRole('admin');
const requireProfesor = requireRole(['admin', 'profesor']);
const requireStudent = requireRole(['admin', 'profesor', 'student']);

// Middleware para añadir información del usuario a las vistas
const addUserToLocals = (req, res, next) => {
    if (req.session && req.session.user) {
        res.locals.currentUser = req.session.user;
        res.locals.isAuthenticated = true;
        res.locals.isAdmin = req.session.user.role === 'admin';
        res.locals.isProfesor = req.session.user.role === 'profesor';
        res.locals.isStudent = req.session.user.role === 'student';
    } else {
        res.locals.currentUser = null;
        res.locals.isAuthenticated = false;
        res.locals.isAdmin = false;
        res.locals.isProfesor = false;
        res.locals.isStudent = false;
    }
    next();
};

module.exports = {
    requireAuth,
    requireGuest,
    requireRole,
    requireAdmin,
    requireProfesor,
    requireStudent,
    addUserToLocals
}; 