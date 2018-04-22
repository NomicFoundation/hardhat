#!/usr/bin/env node
const env = require("./environment");
const { getTaskToRun, getTaskArguments } = require("./arguments");

env.run(getTaskToRun(), ...getTaskArguments()).catch(console.error);
