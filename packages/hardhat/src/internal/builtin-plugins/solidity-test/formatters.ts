import type {
  ArtifactId,
  InlineConfigDirectiveProblem,
  InlineConfigError,
  InlineConfigSourceProblem,
} from "@nomicfoundation/edr";

export function formatArtifactId(
  artifactId: ArtifactId,
  sourceNameToUserSourceName: Map<string, string>,
): string {
  const sourceName =
    sourceNameToUserSourceName.get(artifactId.source) ?? artifactId.source;

  return `${sourceName}:${artifactId.name}`;
}

/**
 * Formats the inline test configuration problems that EDR reports, one per
 * line, each located at the user-facing path of the source it was found in.
 */
export function formatInlineConfigErrors(
  errors: InlineConfigError[],
  sourceNameToUserSourceName: Map<string, string>,
): string {
  return errors
    .map((error) => {
      const sourceName =
        sourceNameToUserSourceName.get(error.sourceName) ?? error.sourceName;

      if (error.kind === "source") {
        return `- ${sourceName}: ${formatInlineConfigSourceProblem(error.problem)}`;
      }

      return `- ${sourceName}:${error.line}: ${error.contract}.${error.function}: ${formatInlineConfigDirectiveProblem(error.problem)}`;
    })
    .join("\n");
}

function formatInlineConfigDirectiveProblem(
  problem: InlineConfigDirectiveProblem,
): string {
  switch (problem.kind) {
    case "InlineConfigInvalidSyntax":
      return `missing "=" in "${problem.directive}"`;
    case "InlineConfigUnsupportedProfile":
      return `unsupported profile "${problem.profile}". Only the "default" profile is supported`;
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

function formatInlineConfigSourceProblem(
  problem: InlineConfigSourceProblem,
): string {
  switch (problem.kind) {
    case "InlineConfigInvalidSolcVersion":
      return "the Solidity version of this source is not supported by the inline configuration parser";
    case "InlineConfigSourceFileNotFound":
      return `the source file could not be read at "${problem.path}": ${problem.reason}`;
    case "InlineConfigDirectiveLocation":
      return `a directive of ${problem.contract}.${problem.function} could not be located: ${problem.reason}`;
  }
}
