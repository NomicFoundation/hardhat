const { TaskDefinition } = require("../arguments-parsing/TaskDefinition");

const tasks = {};

function addTask(name, description, action, isInternal) {
  const previousDefinition = tasks[name];

  if (previousDefinition !== undefined) {
    throw new Error(
      `Cannot redefine task ${name}. Overloading is not supported yet.`
    );
  }

  if (description instanceof Function) {
    action = description;
    description = undefined;
  }

  const t = new TaskDefinition(name, isInternal);

  if (description !== undefined) {
    t.setDescription(description);
  }

  if (action !== undefined) {
    t.setAction(action);
  } else {
    t.setAction(() => {
      throw new Error(`No action set for task ${name}.`);
    });
  }

  tasks[name] = t;

  return t;
}

function task(name, description, action) {
  return addTask(name, description, action, false);
}

function internalTask(name, description, action) {
  return addTask(name, description, action, true);
}

async function runTask(env, name, taskArguments, soolArguments) {
  const taskDefinition = tasks[name];

  if (taskDefinition === undefined) {
    throw new Error(`Task ${name} not defined`);
  }

  return runTaskDefinition(env, taskDefinition, taskArguments, soolArguments);
}

async function runTaskDefinition(
  env,
  taskDefinition,
  taskArguments,
  soolArguments
) {
  env.injectToGlobal();

  if (taskDefinition.previousDefinition) {
    global.runSuper = async (taskArguments, soolArguments) =>
      runTaskDefinition(
        env,
        taskDefinition.previousDefinition,
        taskArguments,
        soolArguments
      );
  } else {
    global.runSuper = async () => {
      throw new Error(
        `Task ${
          taskDefinition.name
        } had no previous definition to run with runSuper.`
      );
    };
  }

  const taskResult = taskDefinition.action(taskArguments, soolArguments);

  global.runSuper = undefined;

  return taskResult;
}

function getTaskDefinitions() {
  return tasks;
}

module.exports = {
  task,
  internalTask,
  runTask,
  getTaskDefinitions
};
