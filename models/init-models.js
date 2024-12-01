var DataTypes = require("sequelize").DataTypes;
var _deliverables = require("./deliverables");
var _project_users = require("./ProjectUser");
var _projects = require("./projects");
var _users = require("./users");

function initModels(sequelize) {
  var deliverables = _deliverables(sequelize, DataTypes);
  var project_users = _project_users(sequelize, DataTypes);
  var projects = _projects(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);

  deliverables.belongsTo(projects, { as: "project", foreignKey: "project_id"});
  projects.hasMany(deliverables, { as: "deliverables", foreignKey: "project_id"});
  project_users.belongsTo(projects, { as: "project", foreignKey: "project_id"});
  projects.hasMany(project_users, { as: "project_users", foreignKey: "project_id"});
  project_users.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(project_users, { as: "project_users", foreignKey: "user_id"});
  projects.belongsTo(users, { as: "teacher", foreignKey: "teacher_id"});
  users.hasMany(projects, { as: "projects", foreignKey: "teacher_id"});

  return {
    deliverables,
    project_users,
    projects,
    users,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
