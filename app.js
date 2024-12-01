// app.js

const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const sequelize = require('./db');
const { Sequelize } = require('sequelize');
 
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");

const Usuario = require('./models/User'); // Asegúrate de que esta ruta sea correcta

// models/relationships.js (Archivo de relaciones)

const User = require('./models/User'); // Importar el modelo de usuario
const Project = require('./models/Project');
const ProjectUser = require('./models/ProjectUser');
const Deliverables = require('./models/Deliverables'); // O la ruta correcta a tu modelo
const File = require('./models/File'); // O la ruta correcta a tu modelo


// Relación de uno a muchos: Un usuario puede tener muchos proyectos (como docente).
User.hasMany(Project, { foreignKey: 'teacher_id' });
Project.belongsTo(User, { foreignKey: 'teacher_id' });

// Relación de muchos a muchos: Un usuario puede estar en muchos proyectos y un proyecto puede tener muchos usuarios.
User.belongsToMany(Project, { through: ProjectUser, foreignKey: 'user_id' });
Project.belongsToMany(User, { through: ProjectUser, foreignKey: 'project_id' });

Deliverables.hasMany(File, { foreignKey: 'deliverable_id' });
File.belongsTo(Deliverables, { foreignKey: 'deliverable_id' });


module.exports = { User, Project, ProjectUser };



const { Op } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'usta2024',
    resave: false,
    saveUninitialized: true,
}));

// Middleware para verificar si el usuario está autenticado
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
}

// Middleware para verificar si el usuario es administrador
function isAdmin(req, res, next) {
    if (req.session.role === 'admin') {
        return next();
    }
    res.status(403).send('Acceso denegado');
}

// Rutas
app.get('/', (req, res) => {
    res.redirect('/login');
});




app.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('login'); // si no ha iniciado sesión dirigir al login
});



app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.redirect('/login?error=Usuario o contraseña incorrectos');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.redirect('/login?error=Usuario o contraseña incorrectos');
        }

        req.session.userId = user.id;
        req.session.role = user.role;
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la autenticación');
    }
});

// Rutas para el dashboard
app.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const loggedInUser = await User.findByPk(req.session.userId);

        // Verificar el rol del usuario y redirigir según corresponda
        if (loggedInUser.role === 'admin') {
            // Para el admin, mostrar el dashboard con todos los usuarios
            const allUsers = await User.findAll();
            return res.render('adminDashboard', { user: loggedInUser, users: allUsers });
        } else if (loggedInUser.role === 'docente') {
            // Para el docente, mostrar los proyectos del docente
            const projects = await Project.findAll({
                where: { teacher_id: loggedInUser.id }  // Filtra proyectos por el ID del docente
            });

            console.log(projects);  // Verifica si se obtienen los proyectos correctamente

            return res.render('teacherDashboard', { user: loggedInUser, projects });

        } else if (loggedInUser.role === 'estudiante') {
            try {
                // Obtener los proyectos asociados al estudiante
                const projectUsers = await ProjectUser.findAll({
                    where: { user_id: loggedInUser.id }, // Filtrar por el ID del estudiante
                    include: [
                        {
                            model: Project, // Incluir los proyectos asociados
                            attributes: ['id', 'project_code', 'project_name', 'project_type', 'teacher_id'], // Atributos del proyecto
                        }
                    ]
                });

                // Luego, obtenemos los docentes asociados a los proyectos
                for (let projectUser of projectUsers) {
                    const teacher = await User.findOne({
                        where: {
                            id: projectUser.Project.teacher_id // Buscar el docente por el teacher_id
                        },
                        attributes: ['name'] // Solo el nombre
                    });

                    // Asignamos el nombre del docente al proyecto
                    projectUser.Project.teacherName = teacher ? teacher.name : 'Sin asignar';
                }

                // Obtener las entregas asociadas a cada proyecto
                for (let projectUser of projectUsers) {
                    // Aquí estamos obteniendo las entregas filtradas por el project_id
                    const entregas = await Deliverables.findAll({
                        where: { project_id: projectUser.Project.id }, // Filtrar por el ID del proyecto
                        attributes: ['id', 'name', 'description', 'due_date', 'status'], // Asegúrate de que estos atributos estén en la tabla Deliverables
                    });

                    // Asignamos las entregas al proyecto
                    projectUser.Project.Deliverables = entregas;
                }

                // Pasamos los datos a la vista de studentDashboard
                return res.render('studentDashboard', {
                    user: loggedInUser,
                    projectUsers
                });

            } catch (error) {
                console.error("Error al obtener proyectos o entregas:", error);
                res.status(500).send("Error al obtener los proyectos o entregas.");
            }
        }

        else {
            // Si el rol no es reconocido, redirigir al login
            return res.redirect('/login');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los proyectos');
    }
});


app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error al cerrar sesión');
        }
        res.redirect('/login');
    });
});

// Rutas CRUD protegidas con isAuthenticated e isAdmin

// Ruta para ver el formulario de creación de usuario
app.get('/users/create', isAuthenticated, isAdmin, (req, res) => {
    res.render('createUser', { error: req.query.error }); // Pasa req.query.error a la vista
});


// Ruta para crear un usuario
app.post('/users', isAuthenticated, isAdmin, async (req, res) => {
    const { name, identification, password, email, role, username } = req.body;
    try {
        // Verificar si el nombre de usuario o la identificación son únicos
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { username },
                    { identification }
                ]
            }
        });

        if (existingUser) {
            return res.redirect(`/users/create?error=El nombre de usuario o la identificación ya están en uso`);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ name, identification, password: hashedPassword, email, role, username });
        res.redirect('/dashboard?success=Usuario creado con éxito');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al crear el usuario');
    }
});


// Ruta para ver el formulario de edición de usuario
app.get('/users/edit/:id', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);

        // Permitir edición si el usuario es admin o está editando su propia información
        if (req.session.role !== 'admin' && req.session.userId !== user.id) {
            return res.status(403).send('Acceso denegado');
        }

        res.render('editUser', { user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener el usuario');
    }
});

// Ruta para actualizar un usuario
app.post('/users/update/:id', isAuthenticated, async (req, res) => {
    const { name, identification, password, email, role, username } = req.body;

    try {
        const user = await User.findByPk(req.params.id);

        // Validar que el usuario esté editando su propia información o sea admin
        if (req.session.role !== 'admin' && req.session.userId !== user.id) {
            return res.status(403).send('Acceso denegado');
        }

        // Si el usuario que está editando es un admin, no permitir que cambie su propio rol
        if (req.session.role === 'admin' && req.session.userId === user.id && role !== user.role) {
            return res.redirect(`/users/edit/${req.params.id}?error=No puedes cambiar tu propio rol`);
        }

        // Verificar si el nombre de usuario o la identificación son únicos
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { username: username, id: { [Op.ne]: req.params.id } },
                    { identification: identification, id: { [Op.ne]: req.params.id } }
                ]
            }
        });

        if (existingUser) {
            return res.redirect(`/users/edit/${req.params.id}?error=El nombre de usuario o la identificación ya están en uso`);
        }

        const hashedPassword = password ? await bcrypt.hash(password, 10) : user.password;

        // Actualizar el usuario sin modificar el rol si es un admin que se edita a sí mismo
        const updateData = {
            name,
            identification,
            password: hashedPassword,
            email,
            username
        };

        // Solo permitir modificar el rol si no es el admin editándose a sí mismo
        if (!(req.session.role === 'admin' && req.session.userId === user.id)) {
            updateData.role = role;
        }

        await user.update(updateData);

        res.redirect('/dashboard?success=Usuario actualizado con éxito');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al actualizar el usuario');
    }
});


// Ruta para eliminar un usuario
app.post('/users/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const userToDelete = await User.findByPk(req.params.id);

        // Verificar si el usuario que intenta eliminar es el administrador
        if (userToDelete.id === req.session.userId) {
            return res.redirect('/dashboard?error=No puedes eliminar tu propia cuenta');
        }

        // Verificar si el docente tiene proyectos asociados
        const projects = await Project.findAll({ where: { teacher_id: userToDelete.id } });
        if (projects.length > 0) {
            return res.redirect('/dashboard?error=No se puede eliminar al docente porque tiene proyectos vinculados');
        }

        await userToDelete.destroy();
        res.redirect('/dashboard?success=Usuario eliminado con éxito');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al eliminar el usuario');
    }
});

// Ruta para editar perfil (solo para estudiantes y docentes)
app.get('/profile/edit', isAuthenticated, async (req, res) => {
    const user = await User.findByPk(req.session.userId);

    // Verificar que el usuario sea docente o estudiante
    if (user.role !== 'docente' && user.role !== 'estudiante') {
        return res.status(403).send('Acceso denegado');
    }

    res.render('editProfile', { user });
});


app.post('/profile/update', isAuthenticated, async (req, res) => {
    const { name, identification, password, email, username } = req.body;

    try {
        const user = await User.findByPk(req.session.userId);

        // Validar la unicidad del nombre de usuario y la identificación
        const existingUserByUsername = await User.findOne({ where: { username, id: { [Op.ne]: user.id } } });
        const existingUserByIdentification = await User.findOne({ where: { identification, id: { [Op.ne]: user.id } } });

        if (existingUserByUsername) {
            return res.redirect(`/profile/edit?error=El nombre de usuario ya está en uso`);
        }

        if (existingUserByIdentification) {
            return res.redirect(`/profile/edit?error=La identificación ya está en uso`);
        }

        const hashedPassword = password ? await bcrypt.hash(password, 10) : user.password;
        await user.update({ name, identification, password: hashedPassword, email, username });
        res.redirect('/dashboard?success=Perfil actualizado con éxito');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al actualizar el perfil');
    }
});





// Ruta para ver el formulario de creación de proyectos
app.get('/projects/create', isAuthenticated, isAdmin, async (req, res) => {
    const teachers = await User.findAll({ where: { role: 'docente' } });
    res.render('createProject', { error: req.query.error, teachers });
});


app.post('/projects', async (req, res) => {
    const { project_code, project_name, project_type, teacher_id, selected_students } = req.body;

    try {
        // Verificar si ya existe un proyecto con el mismo código o nombre
        const existingProject = await Project.findOne({
            where: {
                [Op.or]: [
                    { project_code },
                    { project_name }
                ]
            }
        });

        if (existingProject) {
            // Si el proyecto ya existe, redirige con un mensaje de error
            return res.redirect('/projects/create?error=El código o nombre del proyecto ya existen');
        }

        console.log("Proyecto no existente, procediendo a crear.");

        // Crear el nuevo proyecto y obtener su ID
        const newProject = await Project.create({ project_code, project_name, project_type, teacher_id });
        const projectId = newProject.id; // ID del proyecto recién creado

        // Parsear los estudiantes seleccionados (si vienen como JSON string)
        let studentIds = [];
        try {
            studentIds = JSON.parse(selected_students);
        } catch (error) {
            console.error('Error al parsear estudiantes seleccionados:', error);
            return res.redirect('/projects/create?error=Error en el formato de los estudiantes seleccionados');
        }

        // Validar que se seleccionaron estudiantes
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.redirect('/projects/create?error=Debes seleccionar al menos un estudiante');
        }

        // Insertar cada estudiante en la tabla intermedia (project_users)
        const promises = studentIds.map(studentId =>
            ProjectUser.create({
                project_id: projectId,
                user_id: studentId,
            })
        );

        // Esperar a que todas las inserciones terminen
        await Promise.all(promises);

        // Redirigir con éxito al listado de proyectos
        return res.redirect('/projects?success=Proyecto creado con éxito');
    } catch (error) {
        console.error('Error al crear el proyecto:', error);
        return res.status(500).json({ message: 'Ocurrió un error al crear el proyecto.' });
    }
});

app.get('/projects/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const projectId = req.params.id;

        // Obtener el proyecto por ID
        const project = await Project.findByPk(projectId);

        if (!project) {
            return res.redirect('/projects?error=El proyecto no existe');
        }

        // Obtener la lista de docentes
        const teachers = await User.findAll({ where: { role: 'docente' } });

        // Obtener los estudiantes asociados al proyecto, trayendo user_id, name e identification
        const students = await ProjectUser.findAll({
            where: { project_id: projectId },
            include: {
                model: User,
                attributes: ['id', 'name', 'identification']  // Traer user_id, name, identification del usuario
            }
        });

        // Depurar y verificar la estructura de los estudiantes
        console.log(students);  // Verificar la estructura completa de `students`

        // Extraer solo los datos relevantes de los estudiantes (user_id, name, identification)
        const studentData = students.map(student => {
            if (student.User) {  // Verificar que `student.User` existe (con U mayúscula)
                return {
                    user_id: student.User.id || null,  // Accede a los datos de `User` con la mayúscula
                    name: student.User.name,
                    identification: student.User.identification
                };
            } else {
                // Si no se encuentra `User`, retornar valores predeterminados o manejar el caso
                return {
                    user_id: null,
                    name: 'No disponible',
                    identification: 'No disponible'
                };
            }
        });

        // Renderizar la vista con el proyecto, los docentes y los datos de los estudiantes asociados
        res.render('editProject', {
            project,
            teachers,
            studentData
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener el proyecto');
    }
});



app.post('/projects/update/:id', isAuthenticated, isAdmin, async (req, res) => {
    const { project_code, project_name, teacher_id, selected_students } = req.body;
    const projectId = req.params.id;

    try {
        // Verifica si existe otro proyecto con el mismo `project_code` o `project_name`
        const existingProject = await Project.findOne({
            where: {
                [Op.or]: [
                    { project_code },
                    { project_name }
                ],
                id: { [Op.ne]: projectId } // Excluye el proyecto actual
            }
        });

        if (existingProject) {
            return res.redirect(`/projects/edit/${projectId}?error=El código o nombre del proyecto ya están en uso`);
        }

        // Elimina los registros en la tabla de "ProjectUser" asociados al proyecto
        await ProjectUser.destroy({
            where: { project_id: projectId }
        });

        // Si no hay duplicado, actualiza el proyecto
        await Project.update(
            { project_code, project_name, teacher_id },
            { where: { id: projectId } }
        );

        // Si se seleccionaron estudiantes, reinsertarlos en la tabla de "ProjectUser"
        if (selected_students && selected_students.length > 0) {
            const studentIds = JSON.parse(selected_students);
            const projectUserData = studentIds.map(studentId => ({
                project_id: projectId,
                user_id: studentId // Cambiar "student_id" por "user_id" si corresponde
            }));

            // Insertar los registros de "ProjectUser" para los estudiantes seleccionados
            await ProjectUser.bulkCreate(projectUserData);
        }

        res.redirect('/dashboard?success=Proyecto actualizado con éxito');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al actualizar el proyecto');
    }
});


// Ruta para eliminar un proyecto
app.post('/projects/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
    const projectId = req.params.id;

    try {
        // Verificar si el proyecto existe
        const project = await Project.findByPk(projectId);

        if (!project) {
            return res.redirect('/projects?error=El proyecto no existe');
        }

        // Eliminar las relaciones en la tabla intermedia (project_users)
        await ProjectUser.destroy({
            where: { project_id: projectId },
        });

        // Eliminar el proyecto principal
        await project.destroy();

        // Redirigir con un mensaje de éxito
        res.redirect('/projects?success=Proyecto eliminado con éxito');
    } catch (err) {
        console.error('Error al eliminar el proyecto:', err);
        res.status(500).send('Error al eliminar el proyecto');
    }
});

// Ruta para ver todos los proyectos
app.get('/projects', isAuthenticated, async (req, res) => {
    try {
        const projects = await Project.findAll({
            include: [
                {
                    model: User,
                    attributes: ['name'], // Asegúrate de que 'name' sea el campo que almacena el nombre del docente
                },
            ],
        });

        res.render('projectList', { projects });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los proyectos');
    }
});



app.get('/search', async (req, res) => {
    const searchTerm = req.query.term || '';
    try {
        const students = await User.findAll({
            where: {
                role: 'estudiante',
                [Op.or]: [
                    { name: { [Op.like]: `%${searchTerm}%` } },
                    { identification: { [Op.like]: `%${searchTerm}%` } }
                ]
            }
        });
        res.json(students); // Enviar los resultados como JSON
    } catch (error) {
        console.error('Error al buscar estudiantes:', error);
        res.status(500).json({ error: 'Error al buscar estudiantes' });
    }
});



/*---------------------------------CVS-------------------------------------- */


app.get('/csv', isAuthenticated, isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'csv.html'));
});


// Configuración de multer para almacenar archivos CSV
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    },
});

const upload = multer({ storage: storage });


app.use(express.static("views"));

// Función para verificar si el número de identificación ya existe en la base de datos
const checkIfIdExists = async (identification) => {
    const user = await Usuario.findOne({ where: { identification } });
    return user ? true : false;
};

// Función para verificar si el nombre de usuario ya existe en la base de datos
const checkIfUsernameExists = async (username) => {
    const user = await Usuario.findOne({ where: { username } });
    return user ? true : false;
};

// Función para insertar una persona en la base de datos
const insertPerson = async (identification, name, hashedPassword, email, role, username) => {
    try {
        await Usuario.create({
            name,
            identification,
            password: hashedPassword,
            email,
            role,
            username,
        });
    } catch (err) {
        throw new Error(`Error al insertar usuario: ${err.message}`);
    }
};

// Validar el formato del correo electrónico
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validar el rol
const isValidRole = (role) => {
    const validRoles = ["admin", "docente", "estudiante"];
    return validRoles.includes(role);
};

// Procesar archivo CSV subido
app.post("/upload", upload.single("csvfile"), async (req, res) => {
    const filePath = req.file.path;
    const results = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", async () => {
            let processedCount = 0;
            let duplicateCount = 0;
            let duplicateUsernameCount = 0;
            let invalidEmails = 0;
            let invalidRoles = 0;
            let invalidFields = 0;

            for (const row of results) {
                const { name, identification, password, email, role, username } = row;
                const missingFields = [];

                // Validación de campos faltantes
                if (!name) missingFields.push("name");
                if (!identification) missingFields.push("identification");
                if (!password) missingFields.push("password");
                if (!email) missingFields.push("email");
                if (!role) missingFields.push("role");
                if (!username) missingFields.push("username");

                if (missingFields.length > 0) {
                    console.error(`Faltan campos requeridos en la fila: ${JSON.stringify(row)}`);
                    invalidFields++;
                    continue;
                }

                try {
                    const lowerCaseEmail = email.toLowerCase();
                    const lowerCaseUsername = username.toLowerCase();

                    // Verificaciones de existencia y formato
                    const idExists = await checkIfIdExists(identification);
                    const usernameExists = await checkIfUsernameExists(lowerCaseUsername);

                    if (!isValidEmail(lowerCaseEmail)) {
                        invalidEmails++;
                        continue;
                    }

                    if (!isValidRole(role)) {
                        console.error(`Rol inválido: '${role}' en la fila: ${JSON.stringify(row)}`);
                        invalidRoles++;
                        continue;
                    }

                    if (idExists) {
                        console.log(`La identificación '${identification}' ya existe, omitiendo...`);
                        duplicateCount++;
                        continue;
                    }

                    if (usernameExists) {
                        console.log(`El nombre de usuario '${lowerCaseUsername}' ya existe, omitiendo...`);
                        duplicateUsernameCount++;
                        continue;
                    }

                    const hashedPassword = await bcrypt.hash(password, 10);
                    await insertPerson(
                        identification,
                        name,
                        hashedPassword,
                        lowerCaseEmail,
                        role,
                        lowerCaseUsername
                    );

                    processedCount++;
                } catch (error) {
                    console.error(`Error al procesar la fila: ${error.message}`);
                }
            }

            // Enviar resultado
            res.send({
                processedCount,
                duplicateCount,
                duplicateUsernameCount,
                invalidEmails,
                invalidRoles,
                invalidFields,
            });
        });
});


/* ********************************************** FILES ******************************************** */


// Ruta GET para obtener el nombre del entregable
app.get('/files/:deliverableId', async (req, res) => {
    const { deliverableId } = req.params;

    try {
        // Obtener solo el nombre del entregable
        const deliverable = await Deliverables.findOne({
            attributes: ['name'], // Traer solo el nombre
            where: { id: deliverableId }
        });

        if (!deliverable) {
            return res.status(404).send('El entregable no existe');
        }

        // Renderizar la vista con el nombre del entregable y el ID del entregable
        res.render('fileUpload', {
            deliverableName: deliverable.name,
            deliverableId: deliverableId // Pasa el deliverableId a la vista
        });
    } catch (err) {
        console.error('Error al obtener el entregable:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// Configuración de Multer para cargar archivos
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // Carpeta de destino para otros archivos
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Nombre único para otros archivos
    },
});

const uploadFile = multer({ storage: fileStorage });

// Ruta POST para cargar archivos de la USTA
app.post("/uploadFile", uploadFile.single("file"), async (req, res) => {
    const { autor, deliverable_id } = req.body; // Recibimos el autor y deliverable_id desde el formulario
    const file = req.file; // El archivo cargado
    console.log("Deliverable ID recibido:", deliverable_id);

    // Verifica que el archivo haya sido cargado
    if (!file) {
        return res.status(400).send('No se ha cargado ningún archivo');
    }

    // Verifica que el deliverable_id esté presente
    if (!deliverable_id) {
        return res.status(400).send('No se ha especificado el entregable');
    }

    try {
        // Inserta los datos en la base de datos
        await File.create({
            deliverable_id, // ID del entregable que se envió desde el formulario
            autor: autor,
            filename: file.filename,
            filepath: file.path,
            status: 'pendiente', // Puedes actualizar esto según sea necesario
            score: null, // Si es necesario, puedes dejarlo como null
        });

        // Redirigir con éxito al listado de entregables
        return res.redirect('/files?success=Archivo subido con éxito');
    } catch (err) {
        console.error('Error al guardar el archivo:', err);
        res.status(500).send('Error al guardar el archivo');
    }
});

app.get('/files', isAuthenticated, async (req, res) => {
    try {
        
        const files = await File.findAll({
            include: [{
                model: Deliverables, 
                attributes: ['name'],
            }]
        });

        console.log(files); // Imprimir el resultado de la consulta

        res.render('fileList', { files }); 
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los entregables');
    }
});

app.get('/fileScore', isAuthenticated, async (req, res) => {
    try {
        
        const files = await File.findAll({
            include: [{
                model: Deliverables, 
                attributes: ['name'],
            }]
        });

        console.log(files); // Imprimir el resultado de la consulta

        res.render('fileListScore', { files }); 
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los entregables');
    }
});

// Ruta GET para obtener los datos del archivo
app.get('/editFile/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Buscar el archivo por su ID y obtener el entregable asociado
        const file = await File.findOne({
            where: { id },
            include: [{
                model: Deliverables,
                attributes: ['id', 'name'], // Asegúrate de incluir el id y el nombre del entregable
            }]
        });

        if (!file) {
            return res.status(404).send('El archivo no existe');
        }

        // Obtener el deliverable_id del archivo
        const deliverable_id = file.Deliverables ? file.Deliverables.id : null;
        
        console.log('Archivo encontrado:', file);  // Verifica los datos aquí
        console.log('deliverable_id:', deliverable_id); // Verifica el valor aquí
        
        // Pasar el archivo y el ID del entregable a la vista
        res.render('fileEdit', { file, deliverable_id });
    } catch (err) {
        console.error('Error al obtener el archivo para editar:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// Ruta POST para actualizar el archivo
app.post('/editFile/:id', uploadFile.single('file'), async (req, res) => {
    const { id } = req.params;
    const { autor } = req.body; // Solo tomamos el autor, ya que el deliverable_id ya está en la base de datos
    const file = req.file; // El archivo que se sube

    console.log('Datos recibidos:', req.body); // Verifica los datos del formulario
    console.log('Archivo recibido:', req.file);  // Verifica si el archivo fue recibido

    try {
        // Buscar el archivo a actualizar
        const fileToUpdate = await File.findByPk(id);
        if (!fileToUpdate) {
            return res.status(404).send('El archivo no existe');
        }

        // Si no se ha subido un archivo, mantenemos el filename y filepath actuales
        const updatedFileData = {
            autor: autor, 
            filename: file ? file.filename : fileToUpdate.filename,  // Si hay un nuevo archivo, actualizamos el filename
            filepath: file ? file.path : fileToUpdate.filepath  // Si hay un nuevo archivo, actualizamos el filepath
        };

        console.log('Datos actualizados:', updatedFileData);  // Verifica los datos actualizados

        // Actualizamos el archivo solo si hay cambios
        await fileToUpdate.update(updatedFileData);

        // Redirigir a la lista de archivos con un mensaje de éxito
        return res.redirect('/files?success=Archivo actualizado con éxito');
    } catch (err) {
        console.error('Error al actualizar el archivo:', err);
        res.status(500).send('Error al actualizar el archivo');
    }
});


app.get('/filesTeacher', isAuthenticated, async (req, res) => {
    try {
        
        const files = await File.findAll({
            include: [{
                model: Deliverables, 
                attributes: ['name'],
            }]
        });

        console.log(files); // Imprimir el resultado de la consulta

        res.render('fileTeacherList', { files }); 
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los entregables');
    }
});


app.use(express.json());  // Asegúrate de que esto esté antes de las rutas


app.put('/filesTeacher/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    console.log('Datos recibidos:', req.body);  // Esto debería mostrar el 'status' en la consola

    if (!status) {
        return res.status(400).json({ message: 'El estado es requerido' });
    }

    try {
        const files = await File.findByPk(id);
        if (!files) {
            return res.status(404).json({ message: 'Entregable no encontrado' });
        }

        files.status = status;
        await files.save();

        res.json({ message: 'Estado actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar el estado:', error);
        res.status(500).json({ message: 'Error al actualizar el estado' });
    }
});


app.get('/filesTeacher/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params; // Obtener el id de la entrega

    try {
        // Filtrar archivos relacionados con el entregable
        const files = await File.findAll({
            where: { deliverable_id: id },
            include: [{
                model: Deliverables,
                attributes: ['name'],
            }]
        });

        if (!files.length) {
            return res.render('fileTeacherList', { files: [], message: 'No hay archivos asociados a esta entrega.' });
        }

        res.render('fileTeacherList', { files });
    } catch (err) {
        console.error('Error al obtener los archivos:', err);
        res.status(500).send('Error al obtener los archivos asociados');
    }
});


app.post('/updateScore/:id', async (req, res) => {
    const { id } = req.params;
    const { score } = req.body;

    console.log('Puntaje recibido:', score);  // Verifica si el puntaje llega correctamente

    if (isNaN(score)) {
        return res.status(400).json({ success: false, message: 'Invalid score' });
    }

    try {
        const file = await File.findByPk(id);
        if (file) {
            file.score = score;  // Asigna el puntaje
            await file.save();  // Guarda los cambios
            console.log('File actualizado:', file);  // Verifica si se actualiza correctamente
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'File not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating score', error });
    }
});


/* ************************************************************************************** */

// Ruta para ver todos los proyectos
app.get('/teacher/projet_student/:id', isAuthenticated, async (req, res) => {
    try {
        const projectId = req.params.id;

        // Obtener el proyecto por ID
        const project = await Project.findByPk(projectId);

        if (!project) {
            return res.redirect('/projects?error=El proyecto no existe');
        }

        // Obtener la lista de estudiantes asociados al proyecto
        const projectStudents = await ProjectUser.findAll({
            where: { project_id: projectId },
            include: [{ model: User, attributes: ['name'] }] // Incluir el nombre del usuario asociado
        });

        // Renderizar la vista 'studentList.ejs' y pasar la lista de estudiantes
        res.render('studentList', { projectStudents });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los proyectos');
    }
});

// Ruta para ver el formulario de creación de proyectos
app.get('/deliverables/create', isAuthenticated, async (req, res) => {
    const user = await User.findByPk(req.session.userId);

    // Verificar que el usuario existe
    if (!user) {
        return res.redirect('/login?error=Usuario no encontrado');
    }

    // Obtener los proyectos asociados al teacher_id del usuario
    const projects = await Project.findAll({ where: { teacher_id: user.id } });

    res.render('createDeliverable', { error: req.query.error, projects });
});


// Ruta para crear un nuevo entregable
app.post('/deliverables', isAuthenticated, async (req, res) => {
    const { project_id, name, description, submission_time, due_date, status } = req.body;

    try {
        // Verificar si ya existe un entregable con el mismo `project_id` y `name`
        const existingDeliverable = await Deliverables.findOne({
            where: {
                [Op.and]: [
                    { project_id },
                    { name }
                ]
            }
        });

        if (existingDeliverable) {
            // Si el entregable ya existe, redirige con un mensaje de error
            return res.redirect('/deliverables/create?error=El código o nombre de la entrega ya existen');
        }

        console.log("Entrega no existente, procediendo a crear.");

        // Crear el nuevo entregable
        await Deliverables.create({ project_id, name, description, submission_time, due_date, status });

        // Redirigir con éxito al listado de entregables
        return res.redirect('/deliverables?success=Entrega creada con éxito');
    } catch (error) {
        console.error('Error al crear la entrega:', error);
        return res.redirect('/deliverables/create?error=Ocurrió un error al crear la entrega.');
    }
});

// Ruta para ver todos los entregables de proyectos
app.get('/deliverables', isAuthenticated, async (req, res) => {
    try {
        // Obtener todos los entregables asociados a los proyectos
        const deliverables = await Deliverables.findAll({
            include: [{
                model: Project, // Modelo de proyectos
                attributes: ['project_code', 'project_name', 'project_type', 'teacher_id'] // Seleccionamos solo los atributos necesarios
            }]
        });
        res.render('deliverablesList', { deliverables }); // Pasamos los entregables a la vista
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los entregables');
    }
});

app.post('/deliverables/delete/:id', isAuthenticated, async (req, res) => {
    try {
        // Obtener el ID de los parámetros de la URL
        const deliverablesToDelete = await Deliverables.findByPk(req.params.id);

        // Verificar si el entregable existe
        if (!deliverablesToDelete) {
            return res.redirect('/deliverables?error=La entrega no existe');
        }

        // Eliminar el entregable
        await deliverablesToDelete.destroy();
        res.redirect('/deliverables?success=Entrega eliminada con éxito');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al eliminar la entrega');
    }
});

app.get('/deliverables/edit/:id', isAuthenticated, async (req, res) => {
    try {
        // Buscar el entregable
        const deliverable = await Deliverables.findByPk(req.params.id);
        console.log('Entregable:', deliverable);

        // Verificar si el usuario está logueado
        const user = await User.findByPk(req.session.userId);
        if (!user) {
            return res.redirect('/login?error=Usuario no encontrado');
        }

        // Obtener los proyectos asociados al teacher_id del usuario
        const projects = await Project.findAll({ where: { teacher_id: user.id } });
        console.log('Proyectos:', projects);

        // Renderizar la vista con los datos
        res.render('editDeliverable', { error: req.query.error, deliverable, projects });

    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener la entrega');
    }
});




// Ruta para actualizar un entregable
app.post('/deliverables/update/:id', isAuthenticated, async (req, res) => {
    const { project_id, name, description, submission_time, due_date, status } = req.body;
    const deliverableId = req.params.id;

    try {
        // Verifica si existe otro entregable con el mismo `name` (excluyendo el entregable actual)
        const existingDeliverable = await Deliverables.findOne({
            where: {
                [Op.or]: [
                    { name }
                ],
                id: { [Op.ne]: deliverableId } // Excluye el entregable actual
            }
        });

        if (existingDeliverable) {
            return res.redirect(`/deliverables/edit/${deliverableId}?error=El nombre de la entrega ya está en uso`);
        }

        // Si no hay duplicado, actualiza el entregable
        await Deliverables.update(
            { project_id, name, description, submission_time, due_date, status },
            { where: { id: deliverableId } }
        );

        res.redirect('/deliverables?success=Entrega actualizada con éxito');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al actualizar la entrega');
    }
});

app.put('/deliverables/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;  // Debe ser un valor válido de los que mencionaste ('pendiente', 'entregado', 'revisado')

    const validStatuses = ['pendiente', 'entregado', 'revisado'];  // Los valores válidos para el estado

    // Verifica que el estado sea válido
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Estado no válido' });  // Retorna 400 si el estado no es válido
    }

    try {
        const deliverable = await Deliverables.findByPk(id);  // Busca el entregable por su ID
        if (!deliverable) {
            return res.status(404).json({ message: 'Entregable no encontrado' });  // Retorna 404 si no se encuentra el entregable
        }

        deliverable.status = status;  // Actualiza el estado
        await deliverable.save();  // Guarda el cambio en la base de datos

        res.json({ message: 'Estado actualizado correctamente' });
    } catch (err) {
        console.error('Error al actualizar el estado:', err);
        res.status(500).json({ message: 'Error al actualizar el estado' });
    }
});


app.use(express.json());  // Asegúrate de que esto esté antes de las rutas


app.put('/deliverables/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    console.log('Datos recibidos:', req.body);  // Esto debería mostrar el 'status' en la consola

    if (!status) {
        return res.status(400).json({ message: 'El estado es requerido' });
    }

    try {
        const deliverable = await Deliverables.findByPk(id);
        if (!deliverable) {
            return res.status(404).json({ message: 'Entregable no encontrado' });
        }

        deliverable.status = status;
        await deliverable.save();

        res.json({ message: 'Estado actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar el estado:', error);
        res.status(500).json({ message: 'Error al actualizar el estado' });
    }
});




// Sirve archivos estáticos (como PDFs, DOCX, etc.) desde la carpeta 'uploads'
app.use('/uploads', express.static('uploads'));


// Ruta para manejar la descarga de archivos
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    // Verificar si el archivo existe
    if (fs.existsSync(filePath)) {
        // Establecer las cabeceras para la descarga
        res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
        res.setHeader('Content-Type', 'application/octet-stream');

        // Enviar el archivo al cliente
        res.sendFile(filePath);
    } else {
        res.status(404).send('Archivo no encontrado');
    }
});


sequelize.sync().then(() => {
    console.log('Base de datos sincronizada');
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
});