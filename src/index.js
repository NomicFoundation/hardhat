const { getTaskToRun, getTaskArguments } = require("./arguments");
const { run } = require("./tasks");

async function main() {
  return run(getTaskToRun(), ...getTaskArguments());
}

main().catch(console.error);
