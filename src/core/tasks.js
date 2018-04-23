const tasks = new Map();

function addTask(name, description, func, isInternal) {
  if (func === undefined) {
    func = description;
    description = undefined;
  }

  const previousDefinition = tasks.get(name);

  tasks.set(name, { name, description, func, isInternal, previousDefinition });
}

function task(name, description, func) {
  addTask(name, description, func, false);
}

function internalTask(name, description, func) {
  addTask(name, description, func, true);
}

async function runTask(env, name, ...args) {
  const taskDefinition = tasks.get(name);

  if (taskDefinition === undefined) {
    throw new Error(`Task ${name} not defined`);
  }

  return runTaskDefinition(env, taskDefinition, ...args);
}

async function runTaskDefinition(env, taskDefinition, ...args) {
  env.injectToGlobal();

  if (taskDefinition.previousDefinition) {
    global.runSuper = async (...superArgs) =>
      runTaskDefinition(env, taskDefinition.previousDefinition, ...superArgs);
  } else {
    global.runSuper = async () => {
      throw new Error(
        `Task ${
          taskDefinition.name
        } had no previous definition to run with runSuper.`
      );
    };
  }

  const taskResult = taskDefinition.func(...args);

  global.runSuper = undefined;

  return taskResult;
}

function getPublicTasksNames() {
  return Array.from(tasks.values())
    .filter(t => !t.isInternal)
    .map(t => t.name);
}

function getTaskDescription(name) {
  let taskDefinition = tasks.get(name);

  while (taskDefinition !== undefined) {
    if (taskDefinition.description) {
      return taskDefinition.description;
    }

    taskDefinition = taskDefinition.previousDefinition;
  }

  return "";
}

module.exports = {
  task,
  internalTask,
  runTask,
  getPublicTasksNames,
  getTaskDescription
};
