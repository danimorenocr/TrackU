 const sequelize = require('./db'); // Asegúrate de que esta ruta es correcta
const User = require('./models/User'); // Importar el modelo de usuario
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize'); // Asegúrate de importar Op aquí

async function createAdmin() {
    try {
        // Sincronizar la base de datos (si es necesario)
        await sequelize.sync();

        // Definir los detalles del usuario admin
        const adminDetails = {
            name: 'Admin User',
            identification: '123456789', // para modificar según información del usuario admin
            username: 'admin12', // para modificar según información del usuario admin
            password: 'admin123', // para modificar según información del usuario admin
            email: 'admin@example.com', // para modificar según información del usuario admin
            role: 'admin' // rol definido para el primer usuario admin de la aplicación
        };

        // Comprobar si el usuario admin ya existe basado en username o identification
        const existingAdmin = await User.findOne({ 
            where: { 
                [Op.or]: [
                    { username: adminDetails.username },
                    { identification: adminDetails.identification }
                ]
            }
        });
        
        if (existingAdmin) {
            console.log('El usuario admin ya existe con el mismo username o identification.'); // O puedes lanzar un error si prefieres
            return;
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(adminDetails.password, 10);
        // Crear el usuario admin
        await User.create({
            ...adminDetails,
            password: hashedPassword // Guarda la contraseña hasheada
        });

        console.log('Usuario admin creado exitosamente.');
    } catch (error) {
        console.error('Error al crear el usuario admin:', error);
    } finally {
        // Cerrar la conexión a la base de datos si es necesario
        await sequelize.close();
    }
}

// Ejecutar la función
createAdmin();
