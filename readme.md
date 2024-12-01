# instalaciones:

npm install express multer csv-parser mysql2
npm install bcrypt
npm install ejs
npm install sequelize mysql2 bcryptjs express-session body-parser
npm install bcryptjs

# base de datos

CREATE DATABASE IF NOT EXISTS csv_database;
USE csv_database;

CREATE TABLE users (
id INT(11) NOT NULL AUTO_INCREMENT,
name VARCHAR(255) NOT NULL,
identification VARCHAR(255) NOT NULL UNIQUE,
password VARCHAR(255) NOT NULL,
email VARCHAR(255) NOT NULL,
role ENUM('admin', 'docente', 'estudiante') NOT NULL,
username VARCHAR(255) NOT NULL UNIQUE,
PRIMARY KEY (id)
);

# ejs:

EJS (Embedded JavaScript) es un motor de plantillas que permite generar HTML dinámico en aplicaciones web utilizando JavaScript.

- La sintaxis de EJS:
  Permite insertar variables y estructuras de control directamente en el HTML:
- utilizando los delimitadores: <%= %> para la salida de variables y <% %> para ejecutar código JavaScript.
- Por ejemplo:
  <%= user.name %> inserta el nombre del usuario en la página, y el código <% users.forEach(user => { %> permite iterar sobre un array de usuarios.

# tabla proyectos en la base de datos----------------------------------------------------------------------

CREATE TABLE projects (
id INT(11) NOT NULL AUTO_INCREMENT,
project_code VARCHAR(255) NOT NULL UNIQUE,
project_name VARCHAR(255) NOT NULL UNIQUE,
project_type ENUM('pasantía', 'artículo', 'trabajo de grado') NOT NULL,
teacher_id INT(11) DEFAULT NULL,
createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (id),
FOREIGN KEY (teacher_id) REFERENCES users(id)
);

- createdAt:
  Se establece con un valor predeterminado de CURRENT_TIMESTAMP para almacenar la fecha y hora en la que se inserta el registro.
- updatedAt:
  Se establece con CURRENT_TIMESTAMP como valor predeterminado, y se actualiza automáticamente cada vez que el registro es modificado, gracias a la cláusula ON UPDATE CURRENT_TIMESTAMP.

 <!-- Cuerpo de la tabla donde se llenarán dinámicamente los archivos cargados. -->

                <tbody id="fileTableBody">
                    <% files.forEach(file=> { %>
                        <tr>
                            <td>
                                <%= file.filename %>
                            </td>
                            <td>
                                <%= file.author %>
                            </td>
                            <td>
                                <%= file.originalname %>
                            </td>
                            <td>
                                <%= file.uploadDate %>
                            </td>
                            <td>
                                <%= file.status %>
                            </td>
                            <td>
                                <!-- Aquí se pueden añadir acciones, como botones para ver, descargar o eliminar el archivo. -->
                                <button onclick="downloadFile('<%= file.filename %>')">Descargar</button>
                                <button onclick="deleteFile('<%= file.id %>')">Eliminar</button>
                            </td>
                        </tr>
                        <% }) %>
                </tbody>

# base de datos
DROP DATABASE proyecto_pasantia;
CREATE DATABASE IF NOT EXISTS proyecto_pasantia;
USE proyecto_pasantia;

CREATE TABLE users (
    id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    identification VARCHAR(50) NOT NULL UNIQUE, 
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE, 
    role ENUM('admin', 'docente', 'estudiante') NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE, 
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE projects (
    id INT(11) NOT NULL AUTO_INCREMENT,
    project_code VARCHAR(50) NOT NULL UNIQUE,
    project_name VARCHAR(100) NOT NULL UNIQUE, 
    project_type ENUM('pasantía', 'artículo', 'trabajo de grado') NOT NULL,
    teacher_id INT(11) DEFAULT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE deliverables (
    id INT(11) NOT NULL AUTO_INCREMENT,
    project_id INT(11) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    submission_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pendiente', 'entregado', 'revisado') NOT NULL,
    due_date DATE NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE files (
    id INT(11) NOT NULL AUTO_INCREMENT,
    deliverable_id INT(11) NOT NULL,
    autor VARCHAR(100) NOT NULL,
    originalname VARCHAR(100) NOT NULL, 
    filename VARCHAR(100) NOT NULL,
    filepath VARCHAR(255) NOT NULL,
    status ENUM('pendiente', 'entregado', 'revisado') NOT NULL,
    score INT(11) NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (deliverable_id) REFERENCES deliverables(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE project_users (
    id INT(11) NOT NULL AUTO_INCREMENT,
    project_id INT(11) NOT NULL,
    user_id INT(11) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

