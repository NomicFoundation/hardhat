const tasks = new Map();

function task(name, func) {
  tasks.set(name, func);
}

async function run(name, ...args) {
  const theTask = tasks.get(name);

  if (theTask === undefined) {
    throw new Error(`Task ${name} not defined`);
  }

  return theTask(...args);
}

function getDefinedTasks() {
  return Array.from(tasks.keys());
}

module.exports = { task, run, getDefinedTasks };
