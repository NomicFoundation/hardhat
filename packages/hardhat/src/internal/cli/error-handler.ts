import type * as ClassifierT from "./telemetry/error-classification/classifier.js";

import { styleText } from "node:util";

import {
  HardhatError,
  HardhatPluginError,
} from "@nomicfoundation/hardhat-errors";

import { HARDHAT_NAME, HARDHAT_WEBSITE_URL } from "../constants.js";

// The classifier may import many unrelated things top-level to do its job, so
// we load it lazily.
let classifierModule: typeof ClassifierT | undefined;

/**
 * The different categories of errors that can be handled by hardhat cli.
 * Each category has a different way of being formatted and displayed.
 * To add new categories, add a new entry to this enum and update the
 *  {@link getErrorWithCategory} function and the switch inside
 * {@link printErrorMessages} accordingly.
 */
enum ErrorCategory {
  HARDHAT = "HARDHAT",
  PLUGIN = "PLUGIN",
  COMMUNITY_PLUGIN = "COMMUNITY_PLUGIN",
  HH2_TO_HH3_MIGRATION = "HH2_TO_HH3_MIGRATION",
  CJS_TO_ESM_MIGRATION = "CJS_TO_ESM_MIGRATION",
  OTHER = "OTHER",
}

type ErrorWithCategory =
  | {
      category: ErrorCategory.HARDHAT;
      categorizedError: HardhatError;
    }
  | {
      category: ErrorCategory.PLUGIN;
      categorizedError: HardhatError;
    }
  | {
      category: ErrorCategory.COMMUNITY_PLUGIN;
      categorizedError: HardhatPluginError;
    }
  | {
      category: ErrorCategory.HH2_TO_HH3_MIGRATION;
      categorizedError: Error;
    }
  | {
      category: ErrorCategory.CJS_TO_ESM_MIGRATION;
      categorizedError: Error;
    }
  | {
      category: ErrorCategory.OTHER;
      categorizedError: unknown;
    };

/**
 * Formats and logs error messages based on the category the error belongs to.
 *
 * For each category, we produce up to three pieces:
 *  - `formattedErrorMessage`: the main error message that is always displayed.
 *  - `showMoreInfoMessage`: an optional message that points the user at more
 *    info. It is only displayed when the stack trace is hidden.
 *  - `postErrorStackTraceMessage`: an optional message that is displayed after
 *    the stack trace.
 *
 * @param error the error to handle. Supported categories are defined in
 * {@link ErrorCategory}.
 * @param shouldShowStackTraces whether to show stack traces or not. If true,
 * the stack trace is always shown. If false, the stack trace is only shown for
 * errors of category {@link ErrorCategory.OTHER},
 * {@link ErrorCategory.HH2_TO_HH3_MIGRATION}, and
 * {@link ErrorCategory.CJS_TO_ESM_MIGRATION}.
 * @param print the function used to print the error message, defaults to
 * `console.error`. Useful for testing to capture error messages.
 */
export async function printErrorMessages(
  error: Error,
  shouldShowStackTraces: boolean = false,
  print: (message: string | Error) => void = console.error,
): Promise<void> {
  const { category, categorizedError } = await getErrorWithCategory(error);

  let formattedErrorMessage: string;
  let showMoreInfoMessage: string | undefined;
  let postErrorStackTraceMessage: string | undefined;

  switch (category) {
    case ErrorCategory.HARDHAT:
      formattedErrorMessage = `${styleText(["red", "bold"], `Error ${categorizedError.errorCode}:`)} ${categorizedError.formattedMessage}`;
      showMoreInfoMessage = `For more info go to ${HARDHAT_WEBSITE_URL}${categorizedError.errorCode} or run ${HARDHAT_NAME} with --show-stack-traces`;
      break;
    case ErrorCategory.PLUGIN:
      formattedErrorMessage = `${styleText(["red", "bold"], `Error ${categorizedError.errorCode} in plugin ${categorizedError.pluginId}:`)} ${categorizedError.formattedMessage}`;
      showMoreInfoMessage = `For more info go to ${HARDHAT_WEBSITE_URL}${categorizedError.errorCode} or run ${HARDHAT_NAME} with --show-stack-traces`;
      break;
    case ErrorCategory.COMMUNITY_PLUGIN:
      formattedErrorMessage = `${styleText(["red", "bold"], `Error in community plugin ${categorizedError.pluginId}:`)} ${categorizedError.message}`;
      showMoreInfoMessage = `For more info run ${HARDHAT_NAME} with --show-stack-traces`;
      break;
    case ErrorCategory.HH2_TO_HH3_MIGRATION:
      formattedErrorMessage = styleText(
        ["red", "bold"],
        `Hardhat 3 migration error:`,
      );
      postErrorStackTraceMessage = `It looks like you are migrating from Hardhat 2 to Hardhat 3. The following error often shows up during this kind of migration.\nPlease read https://hardhat.org/migrate-from-hardhat2 to learn how to migrate your project to Hardhat 3.`;
      break;
    case ErrorCategory.CJS_TO_ESM_MIGRATION:
      formattedErrorMessage = styleText(
        ["red", "bold"],
        `Hardhat 3 migration error:`,
      );
      postErrorStackTraceMessage = `It looks like you are migrating from CommonJS to ESM. The following error often shows up during this kind of migration.\nPlease read https://hardhat.org/migrate-to-esm to learn how to migrate your project to ESM.`;
      break;
    case ErrorCategory.OTHER:
      formattedErrorMessage = styleText(
        ["red", "bold"],
        `An unexpected error occurred:`,
      );
      postErrorStackTraceMessage = `If you think this is a bug in Hardhat, please report it here: ${HARDHAT_WEBSITE_URL}report-bug`;
      break;
  }

  const showStackTraces =
    shouldShowStackTraces ||
    category === ErrorCategory.OTHER ||
    category === ErrorCategory.HH2_TO_HH3_MIGRATION ||
    category === ErrorCategory.CJS_TO_ESM_MIGRATION;

  print(formattedErrorMessage);

  print("");

  if (showStackTraces) {
    print(error);
    if (postErrorStackTraceMessage !== undefined) {
      print("");
      print(postErrorStackTraceMessage);
    }
  } else if (showMoreInfoMessage !== undefined) {
    print(showMoreInfoMessage);
  }
}

async function getErrorWithCategory(error: Error): Promise<ErrorWithCategory> {
  if (HardhatError.isHardhatError(error)) {
    if (error.pluginId === undefined) {
      return {
        category: ErrorCategory.HARDHAT,
        categorizedError: error,
      };
    } else {
      return {
        category: ErrorCategory.PLUGIN,
        categorizedError: error,
      };
    }
  }

  if (HardhatPluginError.isHardhatPluginError(error)) {
    return {
      category: ErrorCategory.COMMUNITY_PLUGIN,
      categorizedError: error,
    };
  }

  if (classifierModule === undefined) {
    classifierModule = await import(
      "./telemetry/error-classification/classifier.js"
    );
  }

  // Pass `ignoreDevelopmentTimeFilter=true` so the migration footer also shows
  // when hardhat is run from inside its own monorepo — the dev-time filter is
  // a telemetry concern (don't report to Sentry), unrelated to display routing.
  const classifierCategory = classifierModule.classifyError(error, true);
  if (
    classifierCategory ===
    classifierModule.ErrorCategory.HH2_TO_HH3_MIGRATION_ERROR
  ) {
    return {
      category: ErrorCategory.HH2_TO_HH3_MIGRATION,
      categorizedError: error,
    };
  }
  if (
    classifierCategory ===
    classifierModule.ErrorCategory.CJS_TO_ESM_MIGRATION_ERROR
  ) {
    return {
      category: ErrorCategory.CJS_TO_ESM_MIGRATION,
      categorizedError: error,
    };
  }

  return {
    category: ErrorCategory.OTHER,
    categorizedError: error,
  };
}
