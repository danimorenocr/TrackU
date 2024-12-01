const { Model, DataTypes } = require('sequelize');
const sequelize = require('../db');

class Project extends Model {}

Project.init({
    project_code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    project_name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    project_type: {
        type: DataTypes.ENUM('pasantía', 'artículo', 'trabajo de grado'),
        allowNull: false
    },
    teacher_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    sequelize,
    modelName: 'Project'
});

const User = require('./User'); // Asegúrate de que esta ruta es correcta
Project.belongsTo(User, { foreignKey: 'teacher_id' });


module.exports = Project;
