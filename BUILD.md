
:

```
dist/
├── css/
│   ├── styles.[hash].css
│   └── estructura.[hash].css
├── js/
│   ├── main.[hash].js
│   ├── crud.[hash].js
│   └── vendors.[hash].js
├── assets/
│   └── (otros archivos estáticos copiados)
└── manifest.json
```

## Configuración

- **Webpack**: Configurado en `webpack.config.js`
- **Entry Points**: 
  - `main`: script.js principal
  - `crud`: crud-academico.js
  - `styles`: style.css
  - `estructura`: estructura-academica.css

_## Optimizaciones Incluidas

- ✅ Minificación de CSS y JS
- ✅ Code splitting automático
- ✅ Cache busting con hashes
- ✅ Source maps para desarrollo
- ✅ Optimización de imágenes
- ✅ Limpieza automática del build anterior_



