// testConnection.js
require('dotenv').config();
const sequelize = require('./db');

// Función para probar la conexión
async function testConnection() {
  try {
    // Intentar autenticar la conexión
    await sequelize.authenticate();
    
    // Si tiene éxito, mostrar mensaje
    console.log('✅ Conexión establecida correctamente con la base de datos en Railway!');
    
    // Mostrar la información de la conexión (sin mostrar la contraseña completa)
    const config = sequelize.config;
    const password = config.password ? 
      config.password.substring(0, 3) + '***' + config.password.substring(config.password.length - 3) : 
      '(none)';
    
    console.log('Detalles de la conexión:');
    console.log('- Host:', config.host);
    console.log('- Puerto:', config.port);
    console.log('- Base de datos:', config.database);
    console.log('- Usuario:', config.username);
    console.log('- Contraseña:', password);
    
    // Probar una consulta simple
    try {
      const [results] = await sequelize.query('SHOW TABLES');
      console.log('\nTablas disponibles:');
      if (results.length === 0) {
        console.log('No se encontraron tablas en la base de datos');
      } else {
        const tableField = Object.keys(results[0])[0];
        results.forEach(row => {
          console.log(`- ${row[tableField]}`);
        });
      }
    } catch (queryError) {
      console.error('Error al consultar tablas:', queryError.message);
    }
    
  } catch (error) {
    // Si hay un error, mostrarlo
    console.error('❌ Error al conectar con la base de datos en Railway:');
    console.error(error.message);
    
    // Mostrar más información sobre el error para depuración
    if (error.original) {
      console.error('\nDetalles del error:');
      console.error('- Código:', error.original.code);
      console.error('- Mensaje:', error.original.sqlMessage || error.original.message);
    }
    
    console.log('\nVerifica que:');
    console.log('1. Las credenciales en el archivo .env sean correctas');
    console.log('2. La base de datos esté accesible desde tu ubicación actual');
    console.log('3. Si estás en desarrollo local, es posible que necesites un túnel o VPN');
  } finally {
    // Cerrar la conexión al finalizar
    await sequelize.close();
  }
}

// Ejecutar la prueba
testConnection();