// render.js - Script para configurar la aplicación para Render
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Verificar que el directorio uploads existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('Creando directorio uploads...');
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Asegurarse de que la conexión a la base de datos es válida
const sequelize = require('./db');
sequelize.authenticate()
  .then(() => {
    console.log('✅ Conexión a la base de datos verificada correctamente');
    console.log('La aplicación está lista para ser desplegada en Render');
  })
  .catch(err => {
    console.error('❌ Error en la conexión a la base de datos:', err);
    console.error('Por favor verifica tus variables de entorno y la configuración de la base de datos');
  });