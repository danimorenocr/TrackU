// models/ProjectUser.js
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../db');

// Importar los modelos para hacer las relaciones
const User = require('./User');
const Project = require('./Project');


const ProjectUser = sequelize.define('ProjectUser', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    project_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'projects',  // Aquí haces referencia al nombre de la tabla en la base de datos
            key: 'id',
        },
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',  // Aquí haces referencia al nombre de la tabla en la base de datos
            key: 'id',
        },
    },
}, {
    tableName: 'project_users',  // Especificas el nombre de la tabla de relación
    timestamps: true
});

// Relaciones
User.hasMany(Project, { foreignKey: 'teacher_id' }); // Un docente tiene muchos proyectos
Project.belongsTo(User, { foreignKey: 'teacher_id' }); // Un proyecto pertenece a un docente

// Definir las asociaciones
ProjectUser.belongsTo(User, { foreignKey: 'user_id' });
ProjectUser.belongsTo(Project, { foreignKey: 'project_id' });


// Esto es lo que permite a `ProjectUser` tener acceso a las relaciones con `User` y `Project`
// Modelo Project
Project.belongsToMany(User, {
    through: ProjectUser,   // Tabla intermedia
    foreignKey: 'project_id',
    otherKey: 'user_id',
  });
  
  // Modelo User
  User.belongsToMany(Project, {
    through: ProjectUser,   // Tabla intermedia
    foreignKey: 'user_id',
    otherKey: 'project_id',
  });
  


module.exports = ProjectUser;
