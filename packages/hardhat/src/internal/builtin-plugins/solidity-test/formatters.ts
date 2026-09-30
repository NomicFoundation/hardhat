import type {
  ArtifactId,
  InlineConfigDirectiveProblem,
  TestSourceError,
  TestSourceFileProblem,
} from "@nomicfoundation/edr";

// The parse diagnostics belong to the problem that lists them, so they are
// indented to set them apart.
const PARSE_REASON_INDENT = "    ";

export function formatArtifactId(
  artifactId: ArtifactId,
  sourceNameToUserSourceName: Map<string, string>,
): string {
  const sourceName =
    sourceNameToUserSourceName.get(artifactId.source) ?? artifactId.source;

  return `${sourceName}:${artifactId.name}`;
}

/**
 * Formats the problems that EDR found while collecting from the test sources,
 * one per line. Each is located at the user-facing path of the source it was
 * found in.
 */
export function formatTestSourceErrors(
  errors: TestSourceError[],
  sourceNameToUserSourceName: Map<string, string>,
): string {
  return errors
    .map((error) => {
      const sourceName =
        sourceNameToUserSourceName.get(error.sourceName) ?? error.sourceName;

      if (error.kind === "source") {
        return `- ${sourceName}: ${formatTestSourceFileProblem(error.problem)}`;
      }

      return `- ${sourceName}:${error.line}: ${formatDirectiveOrigin(error.contract, error.function)}: ${formatInlineConfigDirectiveProblem(error.problem)}`;
    })
    .join("\n");
}

/**
 * Names where a directive was found: `Contract.testFn` for a function-level
 * directive, and just `Contract` for a contract-level one, which EDR reports
 * without a function.
 */
function formatDirectiveOrigin(
  contract: string,
  functionName: string | undefined,
): string {
  return functionName === undefined ? contract : `${contract}.${functionName}`;
}

function formatInlineConfigDirectiveProblem(
  problem: InlineConfigDirectiveProblem,
): string {
  switch (problem.kind) {
    case "InlineConfigInvalidSyntax":
      return `missing "=" in "${problem.directive}"`;
    case "InlineConfigUndeclaredProfile":
      return `undeclared profile "${problem.profile}". Declared profiles: ${problem.declaredProfiles.map((profile) => `"${profile}"`).join(", ")}`;
    case "InlineConfigInvalidKey":
      return `invalid key "${problem.key}"`;
    case "InlineConfigInvalidKeyForTestType":
      return `key "${problem.key}" is not valid for ${problem.testType} tests`;
    case "InlineConfigInvalidValue":
      return `invalid value "${problem.value}" for key "${problem.key}". Expected a ${problem.expected}`;
    case "InlineConfigDuplicateKey":
      return `duplicate key "${problem.key}"`;
  }
}

function formatTestSourceFileProblem(problem: TestSourceFileProblem): string {
  switch (problem.kind) {
    case "TestSourceUnsupportedSolcVersion":
      return `this source was compiled with Solidity ${problem.version}, and parsing test sources requires 0.8.0 or newer`;
    case "TestSourceFileNotFound":
      return `the source file could not be read at "${problem.path}": ${problem.reason}`;
    case "TestSourcePathNotProvided":
      return "the path of this source was not provided, so it could not be parsed";
    case "TestSourceParseErrors":
      return `the source could not be parsed:\n${problem.reasons.map((reason) => `${PARSE_REASON_INDENT}${reason}`).join("\n")}`;
    case "TestSourceDirectiveLocation":
      return `a directive of ${formatDirectiveOrigin(problem.contract, problem.function)} could not be located: ${problem.reason}`;
  }
}
