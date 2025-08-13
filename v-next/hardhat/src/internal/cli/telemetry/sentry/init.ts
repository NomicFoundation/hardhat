/* This file is inspired by https://github.com/getsentry/sentry-javascript/blob/9.4.0/packages/node/src/sdk/index.ts */

import type {
  Client,
  ServerRuntimeClientOptions,
  Transport,
} from "@sentry/core";

import os from "node:os";
import path from "node:path";

import {
  createStackParser,
  functionToStringIntegration,
  initAndBind,
  linkedErrorsIntegration,
  nodeStackLineParser,
  ServerRuntimeClient,
  stackParserFromStackParserOptions,
} from "@sentry/core";
import debug from "debug";

import { GENERIC_SERVER_NAME } from "./constants.js";
import { nodeContextIntegration } from "./vendor/integrations/context.js";
import { contextLinesIntegration } from "./vendor/integrations/contextlines.js";
import { createGetModuleFromFilename } from "./vendor/utils/module.js";

const log = debug("hardhat:core:sentry:init");

interface GlobalCustomSentryReporterOptions {
  /**
   * Sentry's DSN
   */
  dsn: string;

  /**
   * The environment used to report the events
   */
  environment: string;

  /**
   * The release of Hardhat
   */
  release: string;

  /**
   * A transport that customizes how we send envelopes to Sentry's server.
   *
   * See the transport module for the different options.
   */
  transport: Transport;

  /**
   * If `true`, the global unhandled rejection and uncaught exception handlers
   * will be installed.
   */
  installGlobalHandlers?: boolean;
}

/**
 * This function initializes a custom global sentry reporter/client.
 *
 * There are two reasons why we customize it, instead of using the default one
 * provided by @sentry/node:
 *   - @sentry/node has an astronomical amount of dependencies -- See https://github.com/getsentry/sentry-javascript/discussions/13846
 *   - We customize the transport to avoid blocking the main Hardhat process
 *     while reporting errors.
 *
 * Once you initialize the custom global sentry reporter, you can use the usual
 * `captureException` and `captureMessage` functions exposed by @sentry/core.
 *
 * The reason that this uses the global instance of sentry (by calling
 * initAndBind), is that using the client directly doesn't work with the linked
 * errors integration.
 *
 * Calling `init` also has an option to set global unhandled rejection and
 * uncaught exception handlers.
 */
export function init(options: GlobalCustomSentryReporterOptions): void {
  const client = initAndBind<ServerRuntimeClient, ServerRuntimeClientOptions>(
    ServerRuntimeClient,
    {
      dsn: options.dsn,
      environment: options.environment,
      serverName: GENERIC_SERVER_NAME,
      release: options.release,
      initialScope: {
        contexts: {
          os: {
            name: os.type(),
            build: os.release(),
            version: os.version(),
          },
          device: {
            arch: os.arch(),
          },
          runtime: {
            name: path.basename(process.title),
            version: process.version,
          },
        },
      },
      transport: () => options.transport,
      integrations: [
        functionToStringIntegration(),
        contextLinesIntegration(),
        linkedErrorsIntegration(),
        nodeContextIntegration(),
      ],
      platform: process.platform,
      stackParser: stackParserFromStackParserOptions(
        createStackParser(nodeStackLineParser(createGetModuleFromFilename())),
      ),
    },
  );

  setupGlobalUnhandledErrorHandlers(client);
}

function createUnhandledErrorListener(
  client: Client,
  isPromiseRejection: boolean,
) {
  const description = isPromiseRejection
    ? "Unhandled promise rejection"
    : "Uncaught exception";

  async function listener(error: Error | unknown) {
    log(description, error);

    client.captureException(error, {
      captureContext: {
        level: "fatal",
      },
      mechanism: {
        handled: false,
        type: "onuncaughtexception",
      },
    });

    await client.flush(100);
    await client.close(100);

    console.error();
    console.error(`${description}:`);
    console.error();
    console.error(error);

    process.exit(1);
  }

  return listener;
}

function setupGlobalUnhandledErrorHandlers(client: Client) {
  log("Setting up global unhandled error handlers");

  process.on("uncaughtException", createUnhandledErrorListener(client, false));
  process.on("unhandledRejection", createUnhandledErrorListener(client, true));
}
