import {
  ERROR_RANGES,
  ErrorDescriptor,
  ERRORS,
  getErrorCode
} from "../packages/buidler-core/src/internal/core/errors-list";

let content = `# Buidler errors

This section contains a list of all the possible errors you may encounter when
using Buidler and an explanation of each of them.`;

for (const [rangeName, range] of Object.entries(ERROR_RANGES)) {
  content += `

## ${range.title}

`;

  for (const errorDescriptor of Object.values<ErrorDescriptor>(
    ERRORS[rangeName]
  )) {
    content += `### ${getErrorCode(errorDescriptor)}: ${errorDescriptor.title}

${errorDescriptor.description}


`;
  }
}

console.log(content);
