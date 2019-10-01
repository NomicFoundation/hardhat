import {
  ERROR_RANGES,
  ErrorDescriptor,
  ERRORS,
  getErrorCode
} from "../packages/buidler-core/src/internal/core/errors-list";

let content = `# Buidler errors redirects
`;

for (const rangeName of Object.keys(ERROR_RANGES)) {
  for (const errorDescriptor of Object.values<ErrorDescriptor>(
    ERRORS[rangeName]
  )) {
    content += `
# ${getErrorCode(errorDescriptor)}
/${getErrorCode(errorDescriptor)} /errors/#${getErrorCode(errorDescriptor)} 302
/${getErrorCode(errorDescriptor).toLowerCase()} /errors/#${getErrorCode(
      errorDescriptor
    )} 302
`;
  }
}

console.log(content);
