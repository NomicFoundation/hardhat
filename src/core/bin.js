#!/usr/bin/env node
const { getConfig } = require("./config");
const { getTaskDefinitions } = require("./tasks");
const { parseArguments } = require("./arguments");
const { createEnvironment } = require("./environment");

const DEFAULT_TASK_NAME = "help";

const config = getConfig();
const parsedArguments = parseArguments(
  getTaskDefinitions(),
  DEFAULT_TASK_NAME,
  process.argv.slice(2)
);

const env = createEnvironment(config, parsedArguments.globalArguments);

env
  .run(parsedArguments.taskName, parsedArguments.taskArguments)
  .catch(console.error);
