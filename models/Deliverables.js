const { Model, DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../db'); // Ajusta la ruta si es necesario
const Project = require('./Project'); // Asegúrate de que esta ruta sea correcta

class Deliverable extends Model { }

Deliverable.init({
    id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    project_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Project,
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    submission_time: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.fn('current_timestamp')
    },
    due_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pendiente', 'entregado', 'revisado'),
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'Deliverable',
    tableName: 'deliverables',
    timestamps: false,
    indexes: [
        {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [
                { name: "id" },
            ]
        },
        {
            name: "project_id",
            using: "BTREE",
            fields: [
                { name: "project_id" },
            ]
        },
    ]
});

// Configurar la relación con Project
Deliverable.belongsTo(Project, { foreignKey: 'project_id' });

module.exports = Deliverable;
