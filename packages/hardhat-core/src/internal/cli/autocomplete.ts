import findup from "find-up";
import * as fs from "fs-extra";
import * as path from "path";

import { HardhatRuntimeEnvironment } from "../../types";
import { HARDHAT_PARAM_DEFINITIONS } from "../core/params/hardhat-params";
import { getCacheDir } from "../util/global-dir";
import { createNonCryptographicHashBasedIdentifier } from "../util/hash";
import { mapValues } from "../util/lang";

import { ArgumentsParser } from "./ArgumentsParser";

type GlobalParam = keyof typeof HARDHAT_PARAM_DEFINITIONS;

interface Suggestion {
  name: string;
  description: string;
}

interface CompletionEnv {
  line: string;
  point: number;
}

interface CompletionData {
  networks: string[];
  tasks: {
    [taskName: string]: {
      name: string;
      description: string;
      isSubtask: boolean;
      paramDefinitions: {
        [paramName: string]: {
          name: string;
          description: string;
          isFlag: boolean;
        };
      };
    };
  };
}

interface Mtimes {
  [filename: string]: number;
}

interface CachedCompletionData {
  completionData: CompletionData;
  mtimes: Mtimes;
}

export const HARDHAT_COMPLETE_FILES = "__hardhat_complete_files__";

export const REQUIRED_HH_VERSION_RANGE = "^1.0.0";

export async function complete({
  line,
  point,
}: CompletionEnv): Promise<Suggestion[] | typeof HARDHAT_COMPLETE_FILES> {
  const completionData = await getCompletionData();

  if (completionData === undefined) {
    return [];
  }

  const { networks, tasks } = completionData;

  const words = line.split(/\s+/).filter((x) => x.length > 0);

  const wordsBeforeCursor = line.slice(0, point).split(/\s+/);
  // examples:
  // `hh compile --network|` => prev: "compile" last: "--network"
  // `hh compile --network |` => prev: "--network" last: ""
  // `hh compile --network ha|` => prev: "--network" last: "ha"
  const [prev, last] = wordsBeforeCursor.slice(-2);

  const startsWithLast = (completion: string) => completion.startsWith(last);

  const coreParams = Object.values(HARDHAT_PARAM_DEFINITIONS)
    .map((param) => ({
      name: ArgumentsParser.paramNameToCLA(param.name),
      description: param.description ?? "",
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
    return networks.filter(startsWithLast).map((network) => ({
      name: network,
      description: "",
    }));
  }

  // if the previous word is a param, then a value is expected
  // we don't complete anything here
  if (prev.startsWith("-")) {
    const paramName = ArgumentsParser.cLAToParamName(prev);

    const globalParam = HARDHAT_PARAM_DEFINITIONS[paramName as GlobalParam];
    if (globalParam !== undefined && !globalParam.isFlag) {
      return HARDHAT_COMPLETE_FILES;
    }

    const isTaskParam =
      task !== undefined &&
      tasks[task]?.paramDefinitions[paramName]?.isFlag === false;

    if (isTaskParam) {
      return HARDHAT_COMPLETE_FILES;
    }
  }

  // if there's no task, we complete either tasks or params
  if (task === undefined || tasks[task] === undefined) {
    const taskSuggestions = Object.values(tasks)
      .filter((x) => !x.isSubtask)
      .map((x) => ({
        name: x.name,
        description: x.description,
      }));
    if (last.startsWith("-")) {
      return coreParams.filter((param) => startsWithLast(param.name));
    }
    return taskSuggestions.filter((x) => startsWithLast(x.name));
  }

  if (!last.startsWith("-")) {
    return HARDHAT_COMPLETE_FILES;
  }

  // if there's a task and the last word starts with -, we complete its params and the global params
  const taskParams = Object.values(tasks[task].paramDefinitions)
    .map((param) => ({
      name: ArgumentsParser.paramNameToCLA(param.name),
      description: param.description,
    }))
    .filter((x) => !words.includes(x.name));

  return [...taskParams, ...coreParams].filter((suggestion) =>
    startsWithLast(suggestion.name)
  );
}

async function getCompletionData(): Promise<CompletionData | undefined> {
  const projectId = getProjectId();

  if (projectId === undefined) {
    return undefined;
  }

  const cachedCompletionData = await getCachedCompletionData(projectId);

  if (cachedCompletionData !== undefined) {
    if (arePreviousMtimesCorrect(cachedCompletionData.mtimes)) {
      return cachedCompletionData.completionData;
    }
  }

  const filesBeforeRequire = Object.keys(require.cache);
  let hre: HardhatRuntimeEnvironment;
  try {
    process.env.TS_NODE_TRANSPILE_ONLY = "1";
    require("../../register");
    hre = (global as any).hre;
  } catch {
    return undefined;
  }
  const filesAfterRequire = Object.keys(require.cache);
  const mtimes = getMtimes(filesBeforeRequire, filesAfterRequire);

  const networks = Object.keys(hre.config.networks);

  // we extract the tasks data explicitly to make sure everything
  // is serializable and to avoid saving unnecessary things from the HRE
  const tasks: CompletionData["tasks"] = mapValues(hre.tasks, (task) => ({
    name: task.name,
    description: task.description ?? "",
    isSubtask: task.isSubtask,
    paramDefinitions: mapValues(task.paramDefinitions, (paramDefinition) => ({
      name: paramDefinition.name,
      description: paramDefinition.description ?? "",
      isFlag: paramDefinition.isFlag,
    })),
  }));

  const completionData: CompletionData = {
    networks,
    tasks,
  };

  await saveCachedCompletionData(projectId, completionData, mtimes);

  return completionData;
}

function getProjectId(): string | undefined {
  const packageJsonPath = findup.sync("package.json");

  if (packageJsonPath === null) {
    return undefined;
  }

  return createNonCryptographicHashBasedIdentifier(
    Buffer.from(packageJsonPath)
  ).toString("hex");
}

function arePreviousMtimesCorrect(mtimes: Mtimes): boolean {
  try {
    return Object.entries(mtimes).every(
      ([file, mtime]) => fs.statSync(file).mtime.valueOf() === mtime
    );
  } catch {
    return false;
  }
}

function getMtimes(filesLoadedBefore: string[], filesLoadedAfter: string[]) {
  const loadedByHardhat = filesLoadedAfter.filter(
    (f) => !filesLoadedBefore.includes(f)
  );
  const stats = loadedByHardhat.map((f) => fs.statSync(f));

  const mtimes = loadedByHardhat.map((f, i) => ({
    [f]: stats[i].mtime.valueOf(),
  }));

  if (mtimes.length === 0) {
    return {};
  }

  return Object.assign(mtimes[0], ...mtimes.slice(1));
}

async function getCachedCompletionData(
  projectId: string
): Promise<CachedCompletionData | undefined> {
  const cachedCompletionDataPath = await getCachedCompletionDataPath(projectId);

  if (fs.existsSync(cachedCompletionDataPath)) {
    try {
      const cachedCompletionData = fs.readJsonSync(cachedCompletionDataPath);
      return cachedCompletionData;
    } catch {
      // remove the file if it seems invalid
      fs.unlinkSync(cachedCompletionDataPath);
      return undefined;
    }
  }
}

async function saveCachedCompletionData(
  projectId: string,
  completionData: CompletionData,
  mtimes: Mtimes
): Promise<void> {
  const cachedCompletionDataPath = await getCachedCompletionDataPath(projectId);

  await fs.outputJson(cachedCompletionDataPath, { completionData, mtimes });
}

async function getCachedCompletionDataPath(projectId: string): Promise<string> {
  const cacheDir = await getCacheDir();

  return path.join(cacheDir, "autocomplete", `${projectId}.json`);
}

function isGlobalFlag(param: string): boolean {
  const paramName = ArgumentsParser.cLAToParamName(param);
  return HARDHAT_PARAM_DEFINITIONS[paramName as GlobalParam]?.isFlag === true;
}

function isGlobalParam(param: string): boolean {
  const paramName = ArgumentsParser.cLAToParamName(param);
  return HARDHAT_PARAM_DEFINITIONS[paramName as GlobalParam]?.isFlag === false;
}
