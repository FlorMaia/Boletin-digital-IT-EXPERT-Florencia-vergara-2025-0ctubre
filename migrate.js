const { runMigration } = require('./config/database');

// Script para ejecutar migración completa
console.log('🔄 EJECUTANDO MIGRACIÓN DE BASE DE DATOS');
console.log('========================================');

runMigration()
    .then(() => {
        console.log('🎯 Migración completada. El servidor está listo para usar.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error en la migración:', error);
        process.exit(1);
    }); 