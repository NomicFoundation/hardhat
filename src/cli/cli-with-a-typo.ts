#!/usr/bin/env node
/* tslint:disable */
const chalk = require("chalk");

console.error(chalk.cyan("You probably wanted to type buidler, not builder."));
console.error(chalk.cyan("Don't worry, we've got you covered!"));
console.error("");

require("./cli");
