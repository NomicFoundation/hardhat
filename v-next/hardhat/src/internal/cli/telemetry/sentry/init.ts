/* This file is inspired by https://github.com/getsentry/sentry-javascript/blob/9.4.0/packages/node/src/sdk/index.ts */

import type { ServerRuntimeClientOptions, Transport } from "@sentry/core";

import os from "node:os";
import path from "node:path";

import {
  captureException,
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
 * Calling `init` will also install the global unhandled rejection and uncaught
 * exception handlers.
 */
export function init(options: GlobalCustomSentryReporterOptions): void {
  initAndBind<ServerRuntimeClient, ServerRuntimeClientOptions>(
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

  setupGlobalUnhandledErrorHandlers();
}

function setupGlobalUnhandledErrorHandlers() {
  process.on("unhandledRejection", (reason, promise) => {
    log("Unhandled rejection", reason, promise);

    captureException(reason, {
      originalException: promise,
      captureContext: {
        extra: { unhandledPromiseRejection: true },
        level: "fatal",
      },
      mechanism: {
        handled: false,
        type: "onunhandledrejection",
      },
    });

    // eslint-disable-next-line no-restricted-syntax -- We just rethrow
    throw reason;
  });

  process.on("uncaughtException", (error) => {
    log("Uncaught exception", error);

    captureException(error, {
      originalException: error,
      captureContext: {
        level: "fatal",
      },
      mechanism: {
        handled: false,
        type: "onuncaughtexception",
      },
    });

    // eslint-disable-next-line no-restricted-syntax -- We just rethrow
    throw error;
  });
}
