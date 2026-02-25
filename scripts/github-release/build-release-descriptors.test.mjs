// @ts-check

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildReleaseDescriptors } from "./build-release-descriptors.mjs";

const ExampleHardhatChangelog = `
# hardhat

## 4.0.0

### Major Changes

- ec03a01: Allow overriding the type of the network configs \`default\` and \`localhost\` [#7805](https://github.com/NomicFoundation/hardhat/pull/7805)

## 3.1.9

### Minor Changes

- 621d07e: Make the coverage work with versions of Solidity that aren't fully supported by EDR [#7982 ](https://github.com/NomicFoundation/hardhat/pull/7982)
- 3e39a06: Round average and median gas usage in the gas analytics output
- 78af2ed: Allow multiple parallel downloads of different compilers ([7946](https://github.com/NomicFoundation/hardhat/pull/7946)).

## 3.1.1

### Patch Changes

- 78af2ef: No more plugins

`;

const exampleHardhatToolboxMochaEthersChangelog = `
# @nomicfoundation/hardhat-toolbox-mocha-ethers

## 3.0.3

### Patch Changes

- 3d03bd6: Upgrade Chai to v6, while keeping compatibility with v5

## 3.0.2

### Patch Changes

- 745af93: Fixed \`hardhat-toolbox-mocha-ethers\` add \`mocha\` to \`peerDependencies\` ([#7519](https://github.com/NomicFoundation/hardhat/issues/7519))

## 3.0.1

### Patch Changes

- 558ac5b: Update installation and config instructions

## 3.0.0

### Major Changes

- 29cc141: First release of Hardhat 3!
`;

const exampleOfHardhatWithEmbeddedEDRChangelog = `
# hardhat

## 3.1.2

### Patch Changes

- 3575a52: Bumped EDR version to [\`0.12.0-next.21\`](https://github.com/NomicFoundation/edr/releases/tag/%40nomicfoundation%2Fedr%400.12.0-next.21).

  ### Minor Changes

  - NomicFoundation/edr@44e779c: Added function-level configuration overrides for Solidity tests

  ### Patch Changes

  - NomicFoundation/edr@b5ad15c: Added support for instrumentation of Solidity \`0.8.32\` and \`0.8.33\`

- fd70728: Bumped EDR version to [\`0.12.0-next.20\`](https://www.npmjs.com/package/@nomicfoundation/edr/v/0.12.0-next.20).

  Patch Changes

  - NomicFoundation/edr@34e1ab4: Updated base mainnet eip1559 parameters after SystemConfig update on 2025-12-18
  - NomicFoundation/edr@2272bc0: Fixed excess_blob_gas calculation after Osaka

## 3.1.1

### Patch Changes

- b3bde25: Disable test summary when mocha is included in runners ([#7781](https://github.com/NomicFoundation/hardhat/issues/7781))
- 88fcf8b: Bumped EDR version to [\`0.12.0-next.19\`](https://www.npmjs.com/package/@nomicfoundation/edr/v/0.12.0-next.19).

  - [faef065](https://github.com/NomicFoundation/edr/commit/faef0656f8c86c6f92c7c309d2373bbca89cbff7): Added support for EIP-7892 (Blob Parameter Only hardforks)
`;

const exampleOfHardhatUtilsWithMajorAndPatchChangesInTheSameEntry = `# @nomicfoundation/hardhat-utils

## 4.0.0

### Major Changes

- 87623db: Introduce new inter-process mutex implementation ([7942](https://github.com/NomicFoundation/hardhat/pull/7942)).
- 726ff37: Update the \`--coverage\` table output to match the style used by \`--gas-stats\`. Thanks @jose-blockchain! ([#7733](https://github.com/NomicFoundation/hardhat/issues/7733))

### Patch Changes

- 87623db: Fix two issues in the \`download\` function ([7942](https://github.com/NomicFoundation/hardhat/pull/7942)).

## 3.0.6

### Patch Changes

- 2bc18b2: Bumped \`viem\` version across all packages [7861](https://github.com/NomicFoundation/hardhat/pull/7861).
`;

describe("buildReleaseDescriptors", () => {
  describe("hardhat release", () => {
    it("should generate a major change descriptor", () => {
      const changelogs = new Map([["hardhat", ExampleHardhatChangelog]]);

      const descriptors = buildReleaseDescriptors(
        {
          publishedPackages: [{ name: "hardhat", version: "4.0.0" }],
        },
        changelogs,
      );

      assert.deepEqual(descriptors, [
        {
          tagName: "hardhat@4.0.0",
          title: "Hardhat v4.0.0",
          draft: true,
          latest: true,
          body:
            "This release [short summary of the changes].\n" +
            "\n" +
            "### Changes\n" +
            "\n" +
            "- ec03a01: Allow overriding the type of the network configs `default` and `localhost` [#7805](https://github.com/NomicFoundation/hardhat/pull/7805)\n" +
            "\n" +
            "---\n" +
            "> 💡 **The Nomic Foundation is hiring! Check [our open positions](https://www.nomic.foundation/jobs).**\n" +
            "---",
        },
      ]);
    });

    it("should generate a minor change descriptor", () => {
      const changelogs = new Map([["hardhat", ExampleHardhatChangelog]]);

      const descriptors = buildReleaseDescriptors(
        {
          publishedPackages: [{ name: "hardhat", version: "3.1.9" }],
        },
        changelogs,
      );

      assert.deepEqual(descriptors, [
        {
          tagName: "hardhat@3.1.9",
          title: "Hardhat v3.1.9",
          draft: true,
          latest: true,
          body:
            "This release [short summary of the changes].\n" +
            "\n" +
            "### Changes\n" +
            "\n" +
            "- 621d07e: Make the coverage work with versions of Solidity that aren't fully supported by EDR [#7982 ](https://github.com/NomicFoundation/hardhat/pull/7982)\n" +
            "- 3e39a06: Round average and median gas usage in the gas analytics output\n" +
            "- 78af2ed: Allow multiple parallel downloads of different compilers ([7946](https://github.com/NomicFoundation/hardhat/pull/7946)).\n" +
            "\n" +
            "---\n" +
            "> 💡 **The Nomic Foundation is hiring! Check [our open positions](https://www.nomic.foundation/jobs).**\n" +
            "---",
        },
      ]);
    });

    it("should generate a patch change descriptor", () => {
      const changelogs = new Map([["hardhat", ExampleHardhatChangelog]]);

      const descriptors = buildReleaseDescriptors(
        {
          publishedPackages: [{ name: "hardhat", version: "3.1.1" }],
        },
        changelogs,
      );

      assert.deepEqual(descriptors, [
        {
          tagName: "hardhat@3.1.1",
          title: "Hardhat v3.1.1",
          draft: true,
          latest: true,
          body:
            "This release [short summary of the changes].\n" +
            "\n" +
            "### Changes\n" +
            "\n" +
            "- 78af2ef: No more plugins\n" +
            "\n" +
            "---\n" +
            "> 💡 **The Nomic Foundation is hiring! Check [our open positions](https://www.nomic.foundation/jobs).**\n" +
            "---",
        },
      ]);
    });

    it("should handle the case where the embedded EDR changelog is present", () => {
      const changelogs = new Map([
        ["hardhat", exampleOfHardhatWithEmbeddedEDRChangelog],
      ]);

      const descriptors = buildReleaseDescriptors(
        {
          publishedPackages: [{ name: "hardhat", version: "3.1.2" }],
        },
        changelogs,
      );

      assert.deepEqual(descriptors, [
        {
          tagName: "hardhat@3.1.2",
          title: "Hardhat v3.1.2",
          draft: true,
          latest: true,
          body:
            "This release [short summary of the changes].\n" +
            "\n" +
            "### Changes\n" +
            "\n" +
            "- 3575a52: Bumped EDR version to [`0.12.0-next.21`](https://github.com/NomicFoundation/edr/releases/tag/%40nomicfoundation%2Fedr%400.12.0-next.21).\n" +
            "\n" +
            "  ### Minor Changes\n" +
            "\n" +
            "  - NomicFoundation/edr@44e779c: Added function-level configuration overrides for Solidity tests\n" +
            "\n" +
            "  ### Patch Changes\n" +
            "\n" +
            "  - NomicFoundation/edr@b5ad15c: Added support for instrumentation of Solidity `0.8.32` and `0.8.33`\n" +
            "\n" +
            "- fd70728: Bumped EDR version to [`0.12.0-next.20`](https://www.npmjs.com/package/@nomicfoundation/edr/v/0.12.0-next.20).\n" +
            "\n" +
            "  Patch Changes\n" +
            "\n" +
            "  - NomicFoundation/edr@34e1ab4: Updated base mainnet eip1559 parameters after SystemConfig update on 2025-12-18\n" +
            "  - NomicFoundation/edr@2272bc0: Fixed excess_blob_gas calculation after Osaka\n" +
            "\n" +
            "---\n" +
            "> 💡 **The Nomic Foundation is hiring! Check [our open positions](https://www.nomic.foundation/jobs).**\n" +
            "---",
        },
      ]);
    });
  });

  describe("non-hardhat package release", () => {
    it("should generate a patch change descriptor", () => {
      const changelogs = new Map([
        [
          "@nomicfoundation/hardhat-toolbox-mocha-ethers",
          exampleHardhatToolboxMochaEthersChangelog,
        ],
      ]);

      const descriptors = buildReleaseDescriptors(
        {
          publishedPackages: [
            {
              name: "@nomicfoundation/hardhat-toolbox-mocha-ethers",
              version: "3.0.3",
            },
          ],
        },
        changelogs,
      );

      assert.deepEqual(descriptors, [
        {
          tagName: "@nomicfoundation/hardhat-toolbox-mocha-ethers@3.0.3",
          title: "",
          draft: false,
          latest: false,
          body:
            "### Changes\n" +
            "\n" +
            "- 3d03bd6: Upgrade Chai to v6, while keeping compatibility with v5\n" +
            "\n" +
            "---\n" +
            "> 💡 **The Nomic Foundation is hiring! Check [our open positions](https://www.nomic.foundation/jobs).**\n" +
            "---",
        },
      ]);
    });

    it("should handle cases where a release include more than one kind of change (major and patch in this case)", () => {
      const changelogs = new Map([
        [
          "@nomicfoundation/hardhat-utils",
          exampleOfHardhatUtilsWithMajorAndPatchChangesInTheSameEntry,
        ],
      ]);

      const descriptors = buildReleaseDescriptors(
        {
          publishedPackages: [
            {
              name: "@nomicfoundation/hardhat-utils",
              version: "4.0.0",
            },
          ],
        },
        changelogs,
      );

      assert.deepEqual(descriptors, [
        {
          tagName: "@nomicfoundation/hardhat-utils@4.0.0",
          draft: false,
          latest: false,
          title: "",
          body:
            "### Changes\n" +
            "\n" +
            "- 87623db: Introduce new inter-process mutex implementation ([7942](https://github.com/NomicFoundation/hardhat/pull/7942)).\n" +
            "- 726ff37: Update the `--coverage` table output to match the style used by `--gas-stats`. Thanks @jose-blockchain! ([#7733](https://github.com/NomicFoundation/hardhat/issues/7733))\n" +
            "- 87623db: Fix two issues in the `download` function ([7942](https://github.com/NomicFoundation/hardhat/pull/7942)).\n" +
            "\n" +
            "---\n" +
            "> 💡 **The Nomic Foundation is hiring! Check [our open positions](https://www.nomic.foundation/jobs).**\n" +
            "---",
        },
      ]);
    });
  });

  describe("error handling", () => {
    it("throws when the requested version is not present in the changelog", () => {
      const changelogs = new Map([["hardhat", ExampleHardhatChangelog]]);

      assert.throws(
        () => {
          buildReleaseDescriptors(
            {
              publishedPackages: [{ name: "hardhat", version: "9.9.9" }],
            },
            changelogs,
          );
        },
        { message: "Changelog entry for version 9.9.9 not found" },
      );
    });

    it("throws when the changelog is malformed", () => {
      const malformedChangelog = `
        hardhat changelog
        this is not a valid changelog format and is missing expected headings`;

      const changelogs = new Map([["hardhat", malformedChangelog]]);

      assert.throws(
        () => {
          buildReleaseDescriptors(
            {
              publishedPackages: [{ name: "hardhat", version: "3.1.1" }],
            },
            changelogs,
          );
        },
        { message: "Changelog entry for version 3.1.1 not found" },
      );
    });
  });
});
