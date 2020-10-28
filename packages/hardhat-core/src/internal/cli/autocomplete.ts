import { HARDHAT_PARAM_DEFINITIONS } from "../core/params/hardhat-params";
import type hardhat from "../lib/hardhat-lib";

import { ArgumentsParser } from "./ArgumentsParser";

interface CompletionEnv {
  line: string;
  point: number;
}

interface Suggestion {
  name: string;
  description?: string;
}

export async function complete({
  line,
  point,
}: CompletionEnv): Promise<Suggestion[]> {
  let hre: typeof hardhat;
  try {
    hre = require("../lib/hardhat-lib");
  } catch (e) {
    return [];
  }

  const words = line.split(/\s+/).filter((x) => x.length > 0);

  const wordsBeforeCursor = line.slice(0, point).split(/\s+/);
  // examples:
  // `hh compile --network|` => prev: "compile" last: "--network"
  // `hh compile --network |` => prev: "--network" last: ""
  // `hh compile --network ha|` => prev: "--network" last: "ha"
  const [prev, last] = wordsBeforeCursor.slice(-2);

  const coreParams = Object.values(HARDHAT_PARAM_DEFINITIONS)
    .map((x) => ({
      name: ArgumentsParser.paramNameToCLA(x.name),
      description: x.description,
    }))
    .filter((x) => !words.includes(x.name));

  // check if the user entered a task
  let task: string | undefined;
  let index = 1;
  while (index < words.length) {
    if (isGlobalFlag(words[index])) {
      index += 1;
    } else if (isGlobalParam(words[index])) {
      index += 2;
    } else if (words[index].startsWith("--")) {
      index += 1;
    } else {
      task = words[index];
      break;
    }
  }

  // if a task was found but it's equal to the last word, it means
  // that the cursor is after the task, we ignore the task in this
  // case because if you have a task `foo` and `foobar` and the
  // line is: `hh foo|`, we want tasks to be suggested
  if (task === last) {
    task = undefined;
  }

  if (prev === "--network") {
    return Object.keys(hre.config.networks).map((name) => ({ name }));
  }

  // if the previous word is a param, then a value is expected
  // we don't complete anything here
  if (prev.startsWith("-")) {
    const paramName = ArgumentsParser.cLAToParamName(prev);

    const globalParam: any = (HARDHAT_PARAM_DEFINITIONS as any)[paramName];
    if (globalParam !== undefined && !globalParam.isFlag) {
      return [];
    }
  }

  // if there's no task, we complete either tasks or params
  if (task === undefined || hre.tasks[task] === undefined) {
    const tasks = Object.values(hre.tasks)
      .map((x) => ({ name: x.name, description: x.description }))
      .filter((x) => !x.name.includes(":"));
    if (last.startsWith("-")) {
      return coreParams;
    }
    return tasks;
  }

  // if there's a task, we complete its params and the global params
  const taskParams = Object.values(hre.tasks[task].paramDefinitions)
    .map((x) => ({
      name: ArgumentsParser.paramNameToCLA(x.name),
      description: x.description,
    }))
    .filter((x) => !words.includes(x.name));

  return [...taskParams, ...coreParams];
}

function isGlobalFlag(param: string): boolean {
  const paramName = ArgumentsParser.cLAToParamName(param);
  return (HARDHAT_PARAM_DEFINITIONS as any)[paramName]?.isFlag === true;
}

function isGlobalParam(param: string): boolean {
  const paramName = ArgumentsParser.cLAToParamName(param);
  return (HARDHAT_PARAM_DEFINITIONS as any)[paramName]?.isFlag === false;
}
