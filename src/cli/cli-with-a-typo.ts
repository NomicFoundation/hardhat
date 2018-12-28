#!/usr/bin/env node
/* tslint:disable */
import colors from "ansi-colors";

console.error(colors.cyan("You probably wanted to type buidler, not builder."));
console.error(colors.cyan("Don't worry, we've got you covered!"));
console.error("");

require("./cli");
