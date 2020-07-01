import * as Sentry from "@sentry/node";
import debug from "debug";
import findup from "find-up";
import * as path from "path";

import { SENTRY_DSN } from "./reporter";

const log = debug("buidler:sentry:subprocess");

function anonymizeFilename(
  filename: string,
  configPath: string | undefined
): string {
  const parts = filename.split(path.sep);

  if (filename === configPath) {
    const packageJsonPath = findup.sync("package.json", {
      cwd: path.dirname(filename),
    });

    if (packageJsonPath === null) {
      // if we can't find a package.json, we just return the basename
      return path.basename(filename);
    }

    return path.relative(path.dirname(packageJsonPath), filename);
  }

  const nodeModulesIndex = parts.indexOf("node_modules");

  if (nodeModulesIndex === -1) {
    if (filename.startsWith("internal")) {
      // show internal parts of the stack trace
      return filename;
    }

    // if the file isn't inside node_modules and it's a user file, we hide it completely
    return "<user-file>";
  }

  return parts.slice(nodeModulesIndex).join(path.sep);
}

function anonymizePaths(o: any, configPath: string | undefined) {
  if (o === null || o === undefined || typeof o !== "object") {
    return;
  }

  for (const key in o) {
    if (!o.hasOwnProperty(key)) {
      continue;
    }

    if (key === "filename" && o[key].replace !== undefined) {
      const filename = o[key];
      o[key] = anonymizeFilename(filename, configPath);
    }
    anonymizePaths(o[key], configPath);
  }
}

async function main() {
  const verbose = process.env.BUIDLER_SENTRY_VERBOSE === "true";

  if (verbose) {
    debug.enable("buidler*");
  }

  log("starting subprocess");
  Sentry.init({
    dsn: SENTRY_DSN,
  });
  const serializedEvent = process.env.BUIDLER_SENTRY_EVENT;

  if (serializedEvent === undefined) {
    log("BUIDLER_SENTRY_EVENT env variable is not set, exiting");
    process.exit(1);
  }

  let event: any;
  try {
    event = JSON.parse(serializedEvent);
  } catch (error) {
    log("BUIDLER_SENTRY_EVENT env variable doesn't have a valid JSON, exiting");
    process.exit(1);
  }

  const configPath = process.env.BUIDLER_SENTRY_CONFIG_PATH;

  anonymizePaths(event, configPath);

  Sentry.captureEvent(event);
  log("sentry event was sent");
}

main().catch(console.error);
