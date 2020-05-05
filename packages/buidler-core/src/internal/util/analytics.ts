import ci from "ci-info";
import debug from "debug";
import { keccak256 } from "ethereumjs-util";
import fs from "fs-extra";
import os from "os";
import path from "path";
import uuid from "uuid/v4";

import * as builtinTaskNames from "../../builtin-tasks/task-names";
import { ExecutionMode, getExecutionMode } from "../core/execution-mode";

import { getPackageJson } from "./packageInfo";

export type UserType = "CI" | "Developer";
const log = debug("buidler:core:analytics");

/**
 * Checks whether we're using Buidler in development mode (that is, we're working _on_ Buidler).
 * We don't want the tasks we run at these moments to be tracked, so we disable analytics if so.
 */
export function isLocalDev(): boolean {
  const executionMode = getExecutionMode();

  return (
    executionMode === ExecutionMode.EXECUTION_MODE_LINKED ||
    executionMode === ExecutionMode.EXECUTION_MODE_TS_NODE_TESTS
  );
}

/**
 * Checks if task name is included in built-in task names list. If not, it's considered external
 * @param taskName
 */
export function isABuiltinTaskName(taskName: string) {
  return Object.values<string>(builtinTaskNames).includes(taskName);
}

export async function getClientId() {
  const globalBuidlerConfigFile = path.join(
    os.homedir(),
    ".buidler",
    "config.json"
  );

  await fs.ensureFile(globalBuidlerConfigFile);

  let clientId;

  log(`Looking up Client Id at ${globalBuidlerConfigFile}`);
  try {
    const data = JSON.parse(await fs.readFile(globalBuidlerConfigFile, "utf8"));

    clientId = data.analytics.clientId;

    log(`Client Id found: ${clientId}`);
  } catch (e) {
    log("Client Id not found, generating a new one");
    clientId = uuid();

    await fs.writeFile(
      globalBuidlerConfigFile,
      JSON.stringify({
        analytics: {
          clientId,
        },
      }),
      "utf-8"
    );

    log(`Successfully generated clientId ${clientId}`);
  }

  return clientId;
}

export function getProjectId(rootPath: string) {
  log(`Computing Project Id for ${rootPath}`);

  const projectId = keccak256(rootPath).toString("hex");

  log(`Project Id set to ${projectId}`);
  return projectId;
}

export function getUserType(): UserType {
  // ci-info hasn't released support for github actions yet, so we
  // test it manually here. See: https://github.com/watson/ci-info/issues/48
  return ci.isCI || process.env.GITHUB_ACTIONS !== undefined
    ? "CI"
    : "Developer";
}

/**
 * At the moment, we couldn't find a reliably way to report the OS () in Node,
 * as the versions reported by the various `os` APIs (`os.platform()`, `os.type()`, etc)
 * return values different to those expected by Google Analytics
 * We decided to take the compromise of just reporting the OS Platform (OSX/Linux/Windows) for now (version information is bogus for now).
 */
export function getOperatingSystem(): string {
  switch (os.type()) {
    case "Windows_NT":
      return "(Windows NT 6.1; Win64; x64)";
    case "Darwin":
      return "(Macintosh; Intel Mac OS X 10_13_6)";
    case "Linux":
      return "(X11; Linux x86_64)";
    default:
      return "(Unknown)";
  }
}

export function getUserAgent(): string {
  return `Node/${process.version} ${getOperatingSystem()}`;
}

export async function getBuidlerVersion(): Promise<string> {
  const { version } = await getPackageJson();

  return `Buidler ${version}`;
}
