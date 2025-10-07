


const app = require('./app');                    // Aplicación Express configurada
const { initializeDatabase } = require('./config/database');  // Función para inicializar la BD


async function startServer() {
    try {
       
        console.log('Inicializando base de datos...');
        await initializeDatabase();  // Crea tablas y datos iniciales si no existen
       
        const PORT = 3000;  // Puerto donde escuchará el servidor
        app.listen(PORT, () => {
            // Callback que se ejecuta cuando el servidor está listo
            console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                      SISTEMA DE GESTIÓN EDUCATIVA                   ║
║                                                                      ║
║  🚀 Servidor ejecutándose en: http://localhost:${PORT}                    ║
║  📚 Base de datos inicializada correctamente                        ║
║  ⚡ Listo para recibir conexiones                                   ║
╚══════════════════════════════════════════════════════════════════════╝
            `);
        });
        
    } catch (error) {
      
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);  // Termina el proceso con código de error
    }
}

// ========================================
// MANEJADORES DE CIERRE GRACEFUL DEL SERVIDOR
// ========================================
// Estos eventos permiten cerrar el servidor de forma controlada

process.on('SIGINT', () => {
    console.log('\n👋 Cerrando servidor gracefully...');
    process.exit(0);  // Cierra el proceso con código de éxito
});

/**
 * Maneja la señal SIGTERM (terminación del proceso)
 * Usado por sistemas de gestión de procesos como PM2
 */
process.on('SIGTERM', () => {
    console.log('\n👋 Cerrando servidor gracefully...');
    process.exit(0);  // Cierra el proceso con código de éxito
});


startServer(); 