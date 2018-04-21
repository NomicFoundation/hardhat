const env = require("./env");
const { getTaskToRun, getTaskArguments } = require("./arguments");

env.run(getTaskToRun(), ...getTaskArguments()).catch(console.error);
