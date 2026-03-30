import type { InstrumentationMetadata } from "@nomicfoundation/edr";

import {
  addStatementCoverageInstrumentation,
  latestSupportedSolidityVersion,
} from "@nomicfoundation/edr";
import { satisfies } from "semver";

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
  let instrumentationVersion = compilationJobSolcVersion;
  if (!satisfies(instrumentationVersion, `<=${latestSupportedVersion}`)) {
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
