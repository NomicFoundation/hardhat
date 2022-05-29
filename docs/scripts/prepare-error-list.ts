import {
  ERROR_RANGES,
  ErrorDescriptor,
  ERRORS,
  getErrorCode
} from "../../packages/hardhat-core/src/internal/core/errors-list";
import * as fs from "fs";
import * as path from "path";

let content = `# Hardhat errors
This section contains a list of all the possible errors you may encounter when
using Hardhat and an explanation of each of them.`;

const errorRedirects = [];

for (const [rangeName, range] of Object.entries(ERROR_RANGES)) {
  content += `
## ${range.title}
`;

  for (const errorDescriptor of Object.values<ErrorDescriptor>(
    ERRORS[rangeName]
  )) {
    const title = `${getErrorCode(errorDescriptor)}: ${errorDescriptor.title}`;

    content += `### ${title}
${errorDescriptor.description}
`;

    const shortLink = getErrorCode(errorDescriptor);
    // TODO: Fix anchor generation
    const anchor = shortLink;

    errorRedirects.push({
      source: `/${shortLink}`,
      destination: `/errors/#${anchor}`,
      permanent: false
    });
    errorRedirects.push({
      source: `/${shortLink.toLowerCase()}`,
      destination: `/errors/#${anchor}`,
      permanent: false
    });
  }
}


fs.writeFileSync(path.join(__dirname, "../src/content/errors/index.md"), content, "utf-8");
fs.writeFileSync(path.join(__dirname, "../temp/error-redirects.json"), JSON.stringify(errorRedirects, undefined, 2), "utf-8");
