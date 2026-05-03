import type { InstrumentationMetadata } from "@nomicfoundation/edr";

import {
  addStatementCoverageInstrumentation,
  latestSupportedSolidityVersion,
} from "@nomicfoundation/edr";
import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import {
  lowerThanOrEqual,
  parseVersion,
} from "@nomicfoundation/hardhat-utils/fast-semver";

/**
 * Instruments a solidity source file as part of a compilation job. i.e. the
 * file is about to be compile as either a root file or a transitive dependency
 * of one of the root files.
 *
 * @param compilationJobSolcVersion The solc version that the compilation job
 *  will use.
 * @param sourceName The source name of the file, as present in the compilation
 *  job.
 * @param fileContent The contents of the file.
 * @param coverageLibraryPath The path to the coverage library. i.e. where to
 *  import it from.
 * @returns An object with the instrumented source and its metadata, and the
 *  solidity version used to instrument the sources.
 */
export function instrumentSolidityFileForCompilationJob({
  compilationJobSolcVersion,
  sourceName,
  fileContent,
  coverageLibraryPath,
}: {
  compilationJobSolcVersion: string;
  sourceName: string;
  fileContent: string;
  coverageLibraryPath: string;
}): {
  source: string;
  metadata: InstrumentationMetadata[];
  instrumentationVersion: string;
} {
  const latestSupportedVersion = latestSupportedSolidityVersion();
  const parsedLatestSupportedVersion = parseVersion(latestSupportedVersion);
  assertHardhatInvariant(
    parsedLatestSupportedVersion !== undefined,
    `Invalid latest supported solidity version: ${latestSupportedVersion}`,
  );
  let instrumentationVersion = compilationJobSolcVersion;
  const parsedInstrumentationVersion = parseVersion(instrumentationVersion);
  assertHardhatInvariant(
    parsedInstrumentationVersion !== undefined,
    `Invalid solc version: ${instrumentationVersion}`,
  );
  if (
    !lowerThanOrEqual(
      parsedInstrumentationVersion,
      parsedLatestSupportedVersion,
    )
  ) {
    instrumentationVersion = latestSupportedVersion;
  }
  const { source, metadata } = addStatementCoverageInstrumentation(
    fileContent,
    sourceName,
    instrumentationVersion,
    coverageLibraryPath,
  );

  return { source, metadata, instrumentationVersion };
}
