const { Model, DataTypes } = require('sequelize');
const sequelize = require('../db'); // Ajusta la ruta si es necesario
const Deliverable = require('./Deliverables'); // Asegúrate de que esta ruta sea correcta

class File extends Model {}

File.init({
    id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    deliverable_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Deliverable,
            key: 'id'
        }
    },
    autor: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    filename: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    filepath: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pendiente', 'en curso', 'completo'),
        allowNull: false
    },
    score: {  // Añadido el campo score como INT(11) NULL
        type: DataTypes.INTEGER,
        allowNull: true, // Permitimos que sea NULL (opcional)
    }
}, {
    sequelize,
    modelName: 'File',
    tableName: 'files',
    timestamps: false, // Si quieres trabajar con fechas de creación y actualización
    indexes: [
        {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
        },
        {
            name: "deliverable_id",
            using: "BTREE",
            fields: [{ name: "deliverable_id" }],
        },
    ],
});



// Configurar la relación con Deliverable
File.belongsTo(Deliverable, { foreignKey: 'deliverable_id' });

module.exports = File;
