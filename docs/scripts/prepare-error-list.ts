import {
  ERROR_RANGES,
  ErrorDescriptor,
  ERRORS,
  getErrorCode,
} from "../../packages/hardhat-core/src/internal/core/errors-list";
import * as fs from "fs";
import * as path from "path";

interface Redirect {
  source: string;
  destination: string;
  permanent: boolean;
}

let content = `# Hardhat errors
This section contains a list of all the possible errors you may encounter when
using Hardhat and an explanation of each of them.`;

const errorRedirects: Redirect[] = [];

for (const [rangeName, range] of Object.entries(ERROR_RANGES)) {
  content += `
## ${range.title}
`;

  for (const errorDescriptor of Object.values<ErrorDescriptor>(
    ERRORS[rangeName]
  )) {
    const errorCode = getErrorCode(errorDescriptor);
    const title = `${errorCode}: ${errorDescriptor.title}`;

    content += `### [${title}](#${errorCode})
${errorDescriptor.description}
`;

    const shortLink = errorCode;
    // TODO: Fix anchor generation
    const anchor = shortLink.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    errorRedirects.push({
      source: `/${shortLink}`,
      destination: `/errors/#${anchor}`,
      permanent: false,
    });
    errorRedirects.push({
      source: `/${shortLink.toLowerCase()}`,
      destination: `/errors/#${anchor}`,
      permanent: false,
    });
  }
}

fs.writeFileSync(
  path.join(__dirname, "../src/content/hardhat-runner/docs/errors/index.md"),
  content,
  "utf-8"
);
fs.writeFileSync(
  path.join(__dirname, "../temp/error-redirects.json"),
  JSON.stringify(errorRedirects, undefined, 2),
  "utf-8"
);
