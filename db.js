// db.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

let sequelize;

// Verificar si hay una URL completa de la base de datos disponible
if (process.env.DATABASE_URL) {
    // Usar la URL de conexión completa
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'mysql',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // Importante para algunas configuraciones de Railway
            }
        },
        logging: false
    });
} else {
    // Usar parámetros individuales como fallback
    sequelize = new Sequelize(
        process.env.DB_NAME || 'proyecto_pasantia',
        process.env.DB_USER || 'root',
        process.env.DB_PASSWORD || '',
        {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            dialect: 'mysql',
            logging: false
        }
    );
}

sequelize.authenticate()
    .then(() => console.log('Conectado a la base de datos MySQL con Sequelize'))
    .catch(err => console.error('Error al conectar a la base de datos:', err));

module.exports = sequelize;
