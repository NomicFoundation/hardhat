import type { StackFrame } from "../../../../../src/internal/cli/telemetry/error-classification/helpers.js";
import type { HardhatPlugin } from "../../../../../src/types/plugins.js";
import type { TestProjectTemplate } from "../../../builtin-plugins/solidity/build-system/resolver/helpers.js";

import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";

import { FrameOrigin } from "../../../../../src/internal/cli/telemetry/error-classification/helpers.js";
import { overrideTask, task } from "../../../../../src/internal/core/config.js";

export async function captureError(fn: () => Promise<unknown>): Promise<Error> {
  try {
    await fn();
  } catch (error) {
    ensureError(error);
    return error;
  }

  assert.fail("Expected function to throw");
}

export function pluginWithTask(
  id: string,
  taskId: string,
  taskActionPath: string,
): HardhatPlugin {
  return {
    id,
    tasks: [
      task(taskId, "test task")
        .setAction(async () => await import(pathToFileURL(taskActionPath).href))
        .build(),
    ],
  };
}

export function pluginWithTaskOverride(
  id: string,
  taskId: string,
  taskActionPath: string,
): HardhatPlugin {
  return {
    id,
    tasks: [
      overrideTask(taskId)
        .setAction(async () => await import(pathToFileURL(taskActionPath).href))
        .build(),
    ],
  };
}

export function pluginWithConfigHook(
  id: string,
  hookFactoryPath: string,
): HardhatPlugin {
  return {
    id,
    hookHandlers: {
      config: async () => await import(pathToFileURL(hookFactoryPath).href),
    },
  };
}

export function firstPartyHelper(message: string): TestProjectTemplate {
  return {
    name: "@nomicfoundation/test-helper",
    version: "1.0.0",
    files: {
      "helper.mjs": `
export async function fail() {
  throw new Error(${JSON.stringify(message)});
}
`,
    },
  };
}

export function errorWithStack(
  name: string,
  message: string,
  stackLines: string[] = [],
  cause?: Error,
): Error {
  const error = new Error(message, cause !== undefined ? { cause } : undefined);
  error.name = name;

  return setStack(error, stackLines);
}

export function setStack<T extends Error>(error: T, stackLines: string[]): T {
  Object.defineProperty(error, "stack", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: `${error.name}: ${error.message}\n${stackLines.join("\n")}`,
  });

  return error;
}

export function frame(location: string, functionName?: string): StackFrame {
  return {
    location,
    functionName,
    origin: FrameOrigin.OTHER,
  };
}
