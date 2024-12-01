// db.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('proyecto_pasantia', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false,  //para mostrar consultas SQL en la consola al ejecutarse
});

sequelize.authenticate()
    .then(() => console.log('Conectado a la base de datos MySQL con Sequelize'))
    .catch(err => console.error('Error al conectar a la base de datos:', err));

module.exports = sequelize;
