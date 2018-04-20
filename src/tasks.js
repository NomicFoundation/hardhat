const tasks = new Map();

function addTask(name, description, func, isInternal) {
  if (func === undefined) {
    func = description;
    description = null;
  }

  tasks.set(name, { name, description, func, isInternal });
}

function task(name, description, func) {
  addTask(name, description, func, false);
}

function internalTask(name, description, func) {
  addTask(name, description, func, true);
}

async function run(name, ...args) {
  // We first load the env, which will define the different tasks.
  const env = require("./env");

  const theTask = tasks.get(name);

  if (theTask === undefined) {
    throw new Error(`Task ${name} not defined`);
  }

  env.injectEnvToGlobal();
  return theTask.func(...args);
}

function getAllTasks() {
  return Array.from(tasks.values());
}

function getPublicTasks() {
  return getAllTasks().filter(t => !t.isInternal);
}

module.exports = { task, internalTask, run, getAllTasks, getPublicTasks };
