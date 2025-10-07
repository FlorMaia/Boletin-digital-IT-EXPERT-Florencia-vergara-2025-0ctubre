const { pool } = require('../config/database');

class UsersController {
    // Eliminar usuario (solo para admins)
    static async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            
            // Verificar que no se elimine a sí mismo
            if (parseInt(userId) === req.session.user.id) {
                return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
            }
            
            // Marcar como inactivo en lugar de eliminar físicamente
            await pool.execute(`
                UPDATE users 
                SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [userId]);
            
            res.json({ success: true, message: 'Usuario eliminado exitosamente' });
            
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            res.status(500).json({ error: 'Error al eliminar usuario' });
        }
    }
}

module.exports = UsersController; 