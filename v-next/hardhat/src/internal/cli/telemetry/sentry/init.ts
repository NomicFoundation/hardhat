/* This file is inspired by https://github.com/getsentry/sentry-javascript/blob/9.4.0/packages/node/src/sdk/index.ts */

import type {
  BaseTransportOptions,
  Integration,
  ServerRuntimeClientOptions,
  Transport,
} from "@sentry/core";

import {
  createStackParser,
  functionToStringIntegration,
  getIntegrationsToSetup,
  initAndBind,
  linkedErrorsIntegration,
  nodeStackLineParser,
  requestDataIntegration,
  ServerRuntimeClient,
  stackParserFromStackParserOptions,
} from "@sentry/core";

import { getHardhatVersion } from "../../../utils/package.js";

import { onUncaughtExceptionIntegration } from "./integrations/onuncaughtexception.js";
import { onUnhandledRejectionIntegration } from "./integrations/onunhandledrejection.js";
import { nodeContextIntegration } from "./vendor/integrations/context.js";
import { contextLinesIntegration } from "./vendor/integrations/contextlines.js";
import { createGetModuleFromFilename } from "./vendor/utils/module.js";

interface InitOptions {
  dsn: string;
  transport: (transportOptions: BaseTransportOptions) => Transport;
  serverName?: string;
  integrations?: (integrations: Integration[]) => Integration[];
}

/**
 * Initialize Sentry for Node, without performance instrumentation.
 */
export async function init(options: InitOptions): Promise<void> {
  const stackParser = stackParserFromStackParserOptions(
    createStackParser(nodeStackLineParser(createGetModuleFromFilename())),
  );

  // NOTE: We do not include most of the default integrations @sentry/node does
  // because in the main hardhat process, we don't use the default integrations
  // at all, and they're of limited use in the context of a reporter subprocess.
  const integrationOptions = {
    defaultIntegrations: [
      // Inbound filters integration filters out events (errors and transactions) mainly based on init inputs we never use
      // Import from @sentry/core if needed
      // inboundFiltersIntegration(),

      functionToStringIntegration(),
      linkedErrorsIntegration(),
      requestDataIntegration(),

      // Native Wrappers
      // Console integration captures console logs as breadcrumbs
      // Vendor https://github.com/getsentry/sentry-javascript/blob/9.4.0/packages/node/src/integrations/console.ts if needed
      // consoleIntegration(),

      // HTTP integration instruments the http(s) modules to capture outgoing requests and attach them as breadcrumbs/spans
      // Vendor https://github.com/getsentry/sentry-javascript/blob/9.4.0/packages/node/src/integrations/http/index.ts if needed
      // httpIntegration(),

      // Native Node Fetch integration instruments the native node fetch module to capture outgoing requests and attach them as breadcrumbs/spans
      // Vendor https://github.com/getsentry/sentry-javascript/blob/9.4.0/packages/node/src/integrations/node-fetch/index.ts if needed
      // nativeNodeFetchIntegration(),

      // Global Handlers
      onUncaughtExceptionIntegration(),
      onUnhandledRejectionIntegration(),

      // Event Info
      contextLinesIntegration(),
      nodeContextIntegration(),

      // Local variables integrations adds local variables to exception frames
      // Vendor https://github.com/getsentry/sentry-javascript/blob/9.4.0/packages/node/src/integrations/local-variables/local-variables-async.ts if needed
      // localVariablesIntegration(),

      // Child process integration captures child process/worker thread events as breadcrumbs
      // Vendor https://github.com/getsentry/sentry-javascript/blob/9.4.0/packages/node/src/integrations/childProcess.ts if needed
      // childProcessIntegration(),

      // Records a session for the current process to track release health
      // Vendor https://github.com/getsentry/sentry-javascript/blob/9.4.0/packages/node/src/integrations/processSession.ts if needed
      // processSessionIntegration(),

      // CommonJS Only
      // Vendor https://github.com/getsentry/sentry-javascript/blob/9.4.0/packages/node/src/integrations/modules.ts if needed
      // modulesIntegration(),
    ],
    integrations: options.integrations,
  };

  const clientOptions: ServerRuntimeClientOptions = {
    sendClientReports: true,
    ...options,
    platform: "node",
    runtime: {
      name: "node",
      version: process.version,
    },
    stackParser,
    integrations: getIntegrationsToSetup(integrationOptions),
    _metadata: {
      sdk: {
        name: "hardhat",
        version: await getHardhatVersion(),
      },
    },
  };

  initAndBind(ServerRuntimeClient, clientOptions);
}
