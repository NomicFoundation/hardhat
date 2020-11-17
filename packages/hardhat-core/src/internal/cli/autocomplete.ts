import { HARDHAT_PARAM_DEFINITIONS } from "../core/params/hardhat-params";
import type hardhat from "../lib/hardhat-lib";

import { ArgumentsParser } from "./ArgumentsParser";

interface CompletionEnv {
  line: string;
  point: number;
}

export async function complete({
  line,
  point,
}: CompletionEnv): Promise<string[]> {
  let hre: typeof hardhat;
  try {
    process.env.TS_NODE_TRANSPILE_ONLY = "1";
    require("../../register");
    const { HardhatContext } = require("../context");
    const context = HardhatContext.getHardhatContext();
    hre = context.getHardhatRuntimeEnvironment();
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

  const startsWithLast = (completion: string) => completion.startsWith(last);

  const coreParams = Object.values(HARDHAT_PARAM_DEFINITIONS)
    .map((x) => x.name)
    .map(ArgumentsParser.paramNameToCLA)
    .filter((x) => !words.includes(x));

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
    return Object.keys(hre.config.networks).filter(startsWithLast);
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
      .map((x) => x.name)
      .filter((x) => !x.includes(":"));
    if (last.startsWith("-")) {
      return coreParams.filter(startsWithLast);
    }
    return tasks.filter(startsWithLast);
  }

  if (!last.startsWith("-")) {
    return [];
  }

  // if there's a task and the last word starts with -, we complete its params and the global params
  const taskParams = Object.values(hre.tasks[task].paramDefinitions)
    .map((x) => x.name)
    .map(ArgumentsParser.paramNameToCLA)
    .filter((x) => !words.includes(x));

  return [...taskParams, ...coreParams].filter((completion) =>
    completion.startsWith(last)
  );
}

function isGlobalFlag(param: string): boolean {
  const paramName = ArgumentsParser.cLAToParamName(param);
  return (HARDHAT_PARAM_DEFINITIONS as any)[paramName]?.isFlag === true;
}

function isGlobalParam(param: string): boolean {
  const paramName = ArgumentsParser.cLAToParamName(param);
  return (HARDHAT_PARAM_DEFINITIONS as any)[paramName]?.isFlag === false;
}
