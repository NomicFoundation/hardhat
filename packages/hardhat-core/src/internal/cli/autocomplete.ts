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
  scopes: {
    [taskName: string]: {
      name: string;
      description: string;
      tasks: Array<{
        name: string;
        description: string;
      }>;
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

  const { networks, tasks, scopes } = completionData;

  const words = line.split(/\s+/).filter((x) => x.length > 0);

  const wordsBeforeCursor = line.slice(0, point).split(/\s+/);
  // 'prev' and 'last' variables examples:
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
  let taskOrScope: string | undefined;
  let index = 1;
  while (index < words.length) {
    if (isGlobalFlag(words[index])) {
      index += 1;
    } else if (isGlobalParam(words[index])) {
      index += 2;
    } else if (words[index].startsWith("--")) {
      index += 1;
    } else {
      taskOrScope = words[index];
      break;
    }
  }

  // If a task or scope is found and it is equal to the last word, it means
  // that the cursor is after the task or scope. In this case, we ignore the task or scope,
  // because if you have a task or scope 'foo' and 'foobar,' and the line is: 'hh foo|',
  // we want tasks or scopes suggested.
  if (taskOrScope === last) {
    taskOrScope = undefined;
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
      taskOrScope !== undefined &&
      tasks[taskOrScope]?.paramDefinitions[paramName]?.isFlag === false;

    if (isTaskParam) {
      return HARDHAT_COMPLETE_FILES;
    }
  }

  // if there's no task or scope, we complete either tasks or params
  if (
    taskOrScope === undefined ||
    (tasks[taskOrScope] === undefined && scopes[taskOrScope] === undefined)
  ) {
    const taskSuggestions = Object.values(tasks)
      .filter((x) => !x.isSubtask)
      .map((x) => ({
        name: x.name,
        description: x.description,
      }));

    const scopeSuggestions = Object.values(scopes).map((x) => ({
      name: x.name,
      description: x.description,
    }));

    if (last.startsWith("-")) {
      return coreParams.filter((param) => startsWithLast(param.name));
    }

    return taskSuggestions
      .concat(scopeSuggestions)
      .filter((x) => startsWithLast(x.name));
  }

  // If the previous word is a scope, then suggest the tasks assigned to it
  if (scopes[prev] !== undefined) {
    return scopes[prev].tasks;
  }

  if (!last.startsWith("-")) {
    return HARDHAT_COMPLETE_FILES;
  }

  // If there's a task and the last word starts with -, we complete its params and the global params.
  // Only tasks have params
  const taskParams = Object.values(tasks[taskOrScope].paramDefinitions)
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

  const scopes: CompletionData["scopes"] = mapValues(hre.scopes, (scope) => ({
    name: scope.name,
    description: scope.description ?? "",
    tasks: Object.values(scope.tasks).map((task) => ({
      name: task.name,
      description: task.description ?? "",
    })),
  }));

  const completionData: CompletionData = {
    networks,
    tasks,
    scopes,
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
