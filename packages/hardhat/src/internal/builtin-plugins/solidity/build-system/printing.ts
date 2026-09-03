import type { BuildScope } from "../../../../types/solidity/build-system.js";
import type {
  CompilerOutput,
  CompilerOutputError,
} from "../../../../types/solidity.js";

import { styleText } from "node:util";

import { pluralize } from "@nomicfoundation/hardhat-utils/string";

import { shouldSuppressWarning } from "./warning-suppression.js";

/**
 * What deciding whether a warning is suppressed needs, beyond the warning
 * itself. These are fields of the build system's options, taken as a parameter
 * rather than read from it, so that printing doesn't depend on the build
 * system that produced what it prints.
 */
export interface WarningSuppressionContext {
  readonly solidityTestsPath: string;
  readonly projectRoot: string;
  readonly coverage: boolean;
}

/**
 * Everything `printCompilationResult` needs about one runnable compilation job.
 *
 * A summary rather than the job itself, because the evm version comes from the
 * job's `solc` input, and asking a job for its input is expensive enough to be
 * worth doing once, by whoever already has it.
 */
export interface CompilationJobSummary {
  /**
   * The compiler's `type`, defaulted to `"solc"`.
   */
  readonly compilerType: string;

  /**
   * The Solidity version the job compiles with.
   */
  readonly solcVersion: string;

  /**
   * The compiler's long version, which for a compiler that isn't `solc` is
   * where its own version comes from.
   */
  readonly solcLongVersion: string;

  /**
   * The evm version of the job's `solc` input, or `undefined` when the input
   * doesn't set one and the compiler's default applies.
   */
  readonly evmVersion: string | undefined;

  /**
   * How many root files the job compiles.
   */
  readonly rootFileCount: number;
}

export function isConsoleLogError(error: CompilerOutputError): boolean {
  const message = error.message;

  return (
    error.type === "TypeError" &&
    typeof message === "string" &&
    message.includes("log") &&
    message.includes("type(library console)")
  );
}

export function isFatalError(error: CompilerOutputError): boolean {
  return error.type !== "Warning" && error.severity === "error";
}

export function hasCompilationErrors(output: CompilerOutput): boolean {
  return output.errors?.some((e) => isFatalError(e)) ?? false;
}

/**
 * This function returns a properly formatted Internal Compiler Error message.
 *
 * This is present due to a bug in Solidity. See: https://github.com/ethereum/solidity/issues/9926
 *
 * If the error is not an ICE, or if it's properly formatted, this function returns undefined.
 */
export function getFormattedInternalCompilerErrorMessage(
  error: CompilerOutputError,
): string | undefined {
  if (error.formattedMessage?.trim() !== "InternalCompilerError:") {
    return;
  }

  // We trim any final `:`, as we found some at the end of the error messages,
  // and then trim just in case a blank space was left
  return `${error.type}: ${error.message}`.replace(/[:\s]*$/g, "").trim();
}

export function printSolcErrorsAndWarnings(
  errors: CompilerOutputError[] | undefined,
  context: WarningSuppressionContext,
): void {
  if (errors === undefined) {
    return;
  }

  // Filter out specific warnings that should be suppressed
  const filteredErrors = errors.filter(
    (error) =>
      !shouldSuppressWarning(
        error.formattedMessage ?? error.message,
        context.solidityTestsPath,
        context.projectRoot,
        context.coverage,
      ),
  );

  console.log();

  for (const error of filteredErrors) {
    if (isFatalError(error)) {
      const errorMessage: string =
        getFormattedInternalCompilerErrorMessage(error) ??
        error.formattedMessage ??
        error.message;

      console.error(
        errorMessage
          .replace(/^\w+:/, (t) => styleText(["red", "bold"], t))
          .trimEnd() + "\n",
      );
    } else {
      console.warn(
        (error.formattedMessage ?? error.message)
          .replace(/^\w+:/, (t) => styleText(["yellow", "bold"], t))
          .trimEnd() + "\n",
      );
    }
  }

  const hasConsoleErrors: boolean = filteredErrors.some((e) =>
    isConsoleLogError(e),
  );

  if (hasConsoleErrors) {
    console.error(
      styleText(
        "red",
        `The console.log call you made isn't supported. See https://hardhat.org/console-log for the list of supported methods.`,
      ),
    );
    console.log();
  }
}

export function printCompilationResult(
  summaries: CompilationJobSummary[],
  options: { scope: BuildScope },
): void {
  const jobsPerVersionAndEvmVersion = new Map<
    string,
    Map<string, CompilationJobSummary[]>
  >();

  if (summaries.length === 0) {
    if (options.scope === "contracts") {
      console.log("No contracts to compile");
    } else {
      console.log("No Solidity tests to compile");
    }

    return;
  }

  for (const summary of summaries) {
    const evmVersion =
      summary.evmVersion ??
      `Check solc ${summary.solcVersion}'s doc for its default evm version`;

    // Group by compiler type + Solidity version to produce separate log
    // lines for e.g. "solc 0.8.33" vs "solx 0.1.3 (Solidity 0.8.33)".
    const groupKey = `${summary.compilerType}#${summary.solcVersion}`;

    let jobsPerVersion = jobsPerVersionAndEvmVersion.get(groupKey);
    if (jobsPerVersion === undefined) {
      jobsPerVersion = new Map();
      jobsPerVersionAndEvmVersion.set(groupKey, jobsPerVersion);
    }

    let jobsPerEvmVersion = jobsPerVersion.get(evmVersion);
    if (jobsPerEvmVersion === undefined) {
      jobsPerEvmVersion = [];
      jobsPerVersion.set(evmVersion, jobsPerEvmVersion);
    }

    jobsPerEvmVersion.push(summary);
  }

  for (const groupKey of [...jobsPerVersionAndEvmVersion.keys()].sort()) {
    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion --
    This is a valid key, just sorted */
    const jobsPerEvmVersion = jobsPerVersionAndEvmVersion.get(groupKey)!;
    const [compilerType, solidityVersion] = groupKey.split("#");

    for (const evmVersion of [...jobsPerEvmVersion.keys()].sort()) {
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion --
      This is a valid key, just sorted */
      const jobs = jobsPerEvmVersion.get(evmVersion)!;

      const rootFiles = jobs.reduce(
        (count, job) => count + job.rootFileCount,
        0,
      );

      // For solc, the compiler version is the Solidity version.
      // For other compilers, extract the compiler's own version from the
      // longVersion stored on the compilation job, and show the Solidity
      // version separately.
      let compilerLabel: string;
      if (compilerType === "solc") {
        compilerLabel = `solc ${solidityVersion}`;
      } else {
        const longVersion = jobs[0].solcLongVersion;
        const compilerVersion = longVersion.split("+")[0];
        compilerLabel = `${compilerType} ${compilerVersion} (Solidity ${solidityVersion})`;
      }

      console.log(
        styleText(
          "bold",
          `Compiled ${rootFiles} Solidity ${pluralize(
            options.scope === "contracts" ? "file" : "test file",
            rootFiles,
          )} with ${compilerLabel}`,
        ),
        `(evm target: ${evmVersion})`,
      );
    }
  }
}
