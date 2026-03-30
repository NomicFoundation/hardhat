import assert from "node:assert/strict";
import { it, describe } from "node:test";

import { anonymizeUserPaths } from "../../../../../src/internal/cli/telemetry/sentry/anonymize-paths.js";

describe("anonymizeUserPaths", () => {
  it("basenames shouldn't be anonymized", () => {
    assert.equal(anonymizeUserPaths("someFile.js"), "someFile.js");
    assert.equal(anonymizeUserPaths("hardhat.config.js"), "hardhat.config.js");
    assert.equal(anonymizeUserPaths("hardhat.config.ts"), "hardhat.config.ts");
    assert.equal(anonymizeUserPaths("foo.json"), "foo.json");
  });

  it("Node.js core modules should not be anonymized", () => {
    assert.equal(anonymizeUserPaths("fs"), "fs");
    assert.equal(anonymizeUserPaths("node:fs"), "node:fs");
    assert.equal(anonymizeUserPaths("node:path"), "node:path");
    assert.equal(anonymizeUserPaths("node:crypto"), "node:crypto");
    assert.equal(
      anonymizeUserPaths("internal/modules/cjs/loader.js"),
      "internal/modules/cjs/loader.js",
    );
    assert.equal(
      anonymizeUserPaths("internal/bootstrap/node"),
      "internal/bootstrap/node",
    );
  });

  it("User project files should be completely anonymized", () => {
    // Unix paths
    assert.equal(
      anonymizeUserPaths("/home/alice/my-project/src/index.js"),
      "<user-path>",
    );
    assert.equal(
      anonymizeUserPaths("/Users/bob/Documents/app/lib/utils.ts"),
      "<user-path>",
    );
    assert.equal(anonymizeUserPaths("/var/www/project/main.js"), "<user-path>");

    // Windows paths
    assert.equal(
      anonymizeUserPaths("C:\\Users\\Alice\\project\\src\\index.js"),
      "<user-path>",
    );
    assert.equal(anonymizeUserPaths("D:\\dev\\my-app\\main.ts"), "<user-path>");
    assert.equal(
      anonymizeUserPaths("C:/Users/Bob/project/file.js"),
      "<user-path>",
    );
  });

  it("file:// URLs should be handled correctly", () => {
    assert.equal(
      anonymizeUserPaths("file:///home/alice/project/main.js"),
      "file://<user-path>",
    );
    assert.equal(
      anonymizeUserPaths("file:///C:/Users/Bob/app/index.js"),
      "file://<user-path>",
    );
    assert.equal(
      anonymizeUserPaths(
        "file:///home/user/project/node_modules/lodash/index.js",
      ),
      "file://<user-path>/node_modules/lodash/index.js",
    );
  });

  it("node_modules dependencies should preserve structure", () => {
    // Basic node_modules
    assert.equal(
      anonymizeUserPaths("/home/alice/project/node_modules/lodash/index.js"),
      "<user-path>/node_modules/lodash/index.js",
    );

    // Nested node_modules
    assert.equal(
      anonymizeUserPaths(
        "/home/alice/project/node_modules/react/node_modules/prop-types/index.js",
      ),
      "<user-path>/node_modules/react/node_modules/prop-types/index.js",
    );

    // Windows paths
    assert.equal(
      anonymizeUserPaths(
        "C:\\Users\\Bob\\project\\node_modules\\express\\lib\\express.js",
      ),
      "<user-path>/node_modules/express/lib/express.js",
    );

    // Deep nesting
    assert.equal(
      anonymizeUserPaths(
        "C:\\Users\\Bob\\project\\node_modules\\express\\node_modules\\lib\\express.js",
      ),
      "<user-path>/node_modules/express/node_modules/lib/express.js",
    );
  });

  it("Relative paths should be handled correctly", () => {
    assert.equal(anonymizeUserPaths("src/index.js"), "<user-path>");
    assert.equal(anonymizeUserPaths("./src/index.js"), "<user-path>");
    assert.equal(anonymizeUserPaths("../lib/utils.ts"), "<user-path>");
    assert.equal(
      anonymizeUserPaths("./node_modules/lodash/index.js"),
      "<user-path>/node_modules/lodash/index.js",
    );
    assert.equal(
      anonymizeUserPaths("../project/node_modules/react/index.js"),
      "<user-path>/node_modules/react/index.js",
    );
  });

  it("Network paths should be handled correctly", () => {
    assert.equal(
      anonymizeUserPaths("\\\\server\\share\\project\\src\\index.js"),
      "<user-path>",
    );

    assert.equal(
      anonymizeUserPaths(
        "\\\\server\\share\\project\\node_modules\\lodash\\index.js",
      ),
      "<user-path>/node_modules/lodash/index.js",
    );

    assert.equal(
      anonymizeUserPaths(
        "\\\\fileserver\\projects\\myapp\\node_modules\\@types\\node\\index.d.ts",
      ),
      "<user-path>/node_modules/@types/node/index.d.ts",
    );
  });

  it("Error messages with embedded paths should be handled", () => {
    assert.equal(
      anonymizeUserPaths(
        "Failed to import ./src/config.js from /home/alice/project/main.js",
      ),
      "Failed to import <user-path> from <user-path>",
    );

    assert.equal(
      anonymizeUserPaths(
        "Module not found: /home/alice/project/node_modules/missing-package",
      ),
      "Module not found: <user-path>/node_modules/missing-package",
    );

    assert.equal(
      anonymizeUserPaths(
        "Error in C:\\Users\\Bob\\project\\src\\index.js: Cannot resolve node_modules/@types/node/index.d.ts",
      ),
      "Error in <user-path>: Cannot resolve node_modules/@types/node/index.d.ts",
    );

    assert.equal(
      anonymizeUserPaths(
        "Error in C:\\Users\\Bob\\project\\src\\index.js: Cannot resolve ./home/node_modules/@types/node/index.d.ts",
      ),
      "Error in <user-path>: Cannot resolve <user-path>/node_modules/@types/node/index.d.ts",
    );

    assert.equal(
      anonymizeUserPaths(
        "TypeError: Cannot read property of undefined at /home/user/app/utils.js:42:15",
      ),
      "TypeError: Cannot read property of undefined at <user-path>:42:15",
    );
  });

  it("Mixed scenarios with multiple paths", () => {
    assert.equal(
      anonymizeUserPaths(
        "Import failed: /home/alice/src/a.js -> /home/alice/node_modules/lib/b.js",
      ),
      "Import failed: <user-path> -> <user-path>/node_modules/lib/b.js",
    );

    assert.equal(
      anonymizeUserPaths(
        "Import failed: /home/alice/src/a.js -> node_modules/lib/b.js",
      ),
      "Import failed: <user-path> -> node_modules/lib/b.js",
    );

    assert.equal(
      anonymizeUserPaths(
        "Could not resolve node:fs from /home/user/project/main.js",
      ),
      "Could not resolve node:fs from <user-path>",
    );

    assert.equal(
      anonymizeUserPaths(
        "Loading internal/modules/cjs/loader for /home/user/app.js via node_modules/loader/index.js",
      ),
      "Loading internal/modules/cjs/loader for <user-path> via node_modules/loader/index.js",
    );
  });

  it("Package manager specific scenarios", () => {
    assert.equal(
      anonymizeUserPaths(
        "/home/user/.pnpm/registry.npmjs.org/lodash/4.17.21/node_modules/lodash/index.js",
      ),
      "<user-path>/.pnpm/registry.npmjs.org/lodash/4.17.21/node_modules/lodash/index.js",
    );

    assert.equal(
      anonymizeUserPaths(
        "/home/user/.yarn/cache/lodash-npm-4.17.21-6382451519-4c7a38b119.zip",
      ),
      "<user-path>/.yarn/cache/lodash-npm-4.17.21-6382451519-4c7a38b119.zip",
    );

    assert.equal(
      anonymizeUserPaths(
        "/home/user/.cache/yarn/lodash-npm-4.17.21-6382451519-4c7a38b119.zip",
      ),
      "<user-path>/.cache/yarn/lodash-npm-4.17.21-6382451519-4c7a38b119.zip",
    );

    assert.equal(
      anonymizeUserPaths(
        "/Users/USERNAME/Library/Caches/Yarn/lodash-npm-4.17.21-6382451519-4c7a38b119.zip",
      ),
      "<user-path>/Caches/Yarn/lodash-npm-4.17.21-6382451519-4c7a38b119.zip",
    );

    // pnpm store
    assert.equal(
      anonymizeUserPaths(
        "/home/user/.pnpm_store/node_modules/lodash-npm-4.17.21-6382451519-4c7a38b119.zip",
      ),
      "<user-path>/.pnpm_store/node_modules/lodash-npm-4.17.21-6382451519-4c7a38b119.zip",
    );

    assert.equal(
      anonymizeUserPaths(
        "/home/user/.pnpm/node_modules/lodash-npm-4.17.21-6382451519-4c7a38b119.zip",
      ),
      "<user-path>/.pnpm/node_modules/lodash-npm-4.17.21-6382451519-4c7a38b119.zip",
    );

    // Typical pnpm package
    assert.equal(
      anonymizeUserPaths(
        "/home/user/node_modules/.pnpm/lodash-npm-4.17.21-6382451519-4c7a38b119.zip",
      ),
      "<user-path>/node_modules/.pnpm/lodash-npm-4.17.21-6382451519-4c7a38b119.zip",
    );
  });

  it("Edge cases and special characters", () => {
    // Paths with spaces
    assert.equal(
      anonymizeUserPaths("/home/alice/my project/src/index.js"),
      "<user-path> <user-path>",
    );

    assert.equal(
      anonymizeUserPaths(
        "/home/alice/my project/node_modules/some package/index.js",
      ),
      "<user-path> <user-path>/node_modules/some <user-path>",
    );

    // Empty and minimal inputs
    assert.equal(anonymizeUserPaths(""), "");
    assert.equal(anonymizeUserPaths("   "), "   ");
    assert.equal(anonymizeUserPaths("just text"), "just text");

    // Just node_modules
    assert.equal(anonymizeUserPaths("node_modules"), "node_modules");
    assert.equal(
      anonymizeUserPaths("/home/user/node_modules"),
      "<user-path>/node_modules",
    );

    // Root paths
    assert.equal(anonymizeUserPaths("/"), "/");
    assert.equal(anonymizeUserPaths("C:\\"), "C:\\");
  });

  it("Quoted paths in messages", () => {
    assert.equal(
      anonymizeUserPaths(
        'Error: Cannot find module "/home/alice/project/src/missing.js"',
      ),
      'Error: Cannot find module "<user-path>"',
    );

    assert.equal(
      anonymizeUserPaths(
        `Import failed: './src/app.js' not found in "/home/user/project"`,
      ),
      `Import failed: '<user-path>' not found in "<user-path>"`,
    );

    assert.equal(
      anonymizeUserPaths(
        `Using node_modules from '/home/user/project/node_modules/react'`,
      ),
      `Using node_modules from '<user-path>/node_modules/react'`,
    );
  });

  it("Complex real-world error messages", () => {
    const errorMessage = `Module build failed (from /home/developer/project/node_modules/babel-loader/lib/index.js):
SyntaxError: /home/developer/project/src/components/App.tsx:45:12
    at node:internal/modules/cjs/loader:936:15
    at foo.js:13:58
    at /home/developer/project/node_modules/@babel/core/lib/transformation/normalize-file.js:13:58`;

    const expected = `Module build failed (from <user-path>/node_modules/babel-loader/lib/index.js):
SyntaxError: <user-path>:45:12
    at node:internal/modules/cjs/loader:936:15
    at foo.js:13:58
    at <user-path>/node_modules/@babel/core/lib/transformation/normalize-file.js:13:58`;

    assert.equal(anonymizeUserPaths(errorMessage), expected);
  });

  it("Path-only inputs (entire string is a path)", () => {
    assert.equal(
      anonymizeUserPaths("/home/alice/project/main.js"),
      "<user-path>",
    );
    assert.equal(
      anonymizeUserPaths("/home/alice/project/node_modules/lodash/index.js"),
      "<user-path>/node_modules/lodash/index.js",
    );
    assert.equal(anonymizeUserPaths("node:fs"), "node:fs");
    assert.equal(
      anonymizeUserPaths("C:\\Users\\Bob\\app\\src\\index.ts"),
      "<user-path>",
    );
    assert.equal(
      anonymizeUserPaths("./src/components/Header.tsx"),
      "<user-path>",
    );
    assert.equal(
      anonymizeUserPaths("../../node_modules/react/index.js"),
      "<user-path>/node_modules/react/index.js",
    );
  });

  it("Regression tests", () => {
    assert.equal(
      anonymizeUserPaths(
        "Something happened at file file://home/foo.js and at file file://home/foo.js",
      ),
      "Something happened at file file://<user-path> and at file file://<user-path>",
    );

    assert.equal(
      anonymizeUserPaths(
        "Something happened at file file:///workspaces/hardhat/v-next/hardhat/test/internal/cli/telemetry/sentry/anonymizer.ts and at file /workspaces/hardhat/v-next/some-other-file.js",
      ),
      "Something happened at file file://<user-path> and at file <user-path>",
    );

    assert.equal(
      anonymizeUserPaths(
        "Something happened at file file:///workspaces/hardhat/v-next/hardhat/test/internal/cli/telemetry/sentry/anonymizer.ts and\n" +
          "something else happened at file /workspaces/hardhat/v-next/some-other-file.js",
      ),
      "Something happened at file file://<user-path> and\n" +
        "something else happened at file <user-path>",
    );
  });
});
