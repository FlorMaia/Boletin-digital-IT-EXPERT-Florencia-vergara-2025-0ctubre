#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando proceso de build...\n');

try {
  // Limpiar directorio de build anterior
  console.log('🧹 Limpiando directorio de build...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  
  // Ejecutar webpack build
  console.log('📦 Compilando assets con webpack...');
  execSync('webpack --mode=production', { stdio: 'inherit' });
  
  // Crear archivo de manifest para versionado
  const manifest = {
    buildTime: new Date().toISOString(),
    version: require('./package.json').version,
    assets: {}
  };
  
  // Leer archivos generados y crear manifest
  if (fs.existsSync('dist')) {
    const distFiles = fs.readdirSync('dist', { recursive: true });
    distFiles.forEach(file => {
      if (typeof file === 'string' && file.includes('.')) {
        const filePath = path.join('dist', file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          manifest.assets[file] = {
            size: stats.size,
            modified: stats.mtime
          };
        }
      }
    });
  }
  
  fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
  
  console.log('\n✅ Build completado exitosamente!');
  console.log('📁 Archivos generados en: ./dist/');
  console.log('📊 Manifest creado: ./dist/manifest.json');
  
} catch (error) {
  console.error('❌ Error durante el build:', error.message);
  process.exit(1);
}
