const { getConfig } = require("./config");
const { run } = require("./tasks");

async function main() {
  global.config = getConfig();

  const taskName = process.argv[2];
  const taskArgs = process.argv.slice(3);

  return run(taskName, ...taskArgs);
}

main().catch(console.error);
