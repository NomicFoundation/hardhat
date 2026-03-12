import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getLastChangelogEntry, cleanChangelogEntry } from "./bump-peers.ts";

// Fixtures based on actual `pnpm changeset version` output with GITHUB_TOKEN
// set, with added changesets for testing purpuses.

const HARDHAT_ETHERS_CHANGELOG = `# @nomicfoundation/hardhat-ethers

## 4.0.7

### Patch Changes

- [\`a09c8a6\`](https://github.com/NomicFoundation/hardhat/commit/a09c8a6140ac75598d29c0b0550a36e745ffd3bb) Thanks [@alcuadrado](https://github.com/alcuadrado)! - patch bump in hardhat-ethers and hardhat-viem

- Updated dependencies [[\`01b41ee\`](https://github.com/NomicFoundation/hardhat/commit/01b41ee70fe643a3bf6f98ef5f22298e80f66e5f), [\`e37f96c\`](https://github.com/NomicFoundation/hardhat/commit/e37f96c0c1b38fca41b8645042d51a649e7f5bda), [\`bda5a0a\`](https://github.com/NomicFoundation/hardhat/commit/bda5a0a7aeaccb8246fe3cdac050cab21e772629)]:
  - @nomicfoundation/hardhat-errors@3.0.8
  - @nomicfoundation/hardhat-utils@4.0.1
  - hardhat@3.1.12

## 4.0.6

### Patch Changes

- bc193be: Use concrete value types for contract names in hardhat-viem and hardhat-ethers
`;

const HARDHAT_VIEM_CHANGELOG = `# @nomicfoundation/hardhat-viem

## 4.0.0

### Major Changes

- [\`65236d1\`](https://github.com/NomicFoundation/hardhat/commit/65236d18b07abced51722b61179b12c20bc7b713) Thanks [@alcuadrado](https://github.com/alcuadrado)! - major bump in hardhat-viem

### Minor Changes

- [\`65236d1\`](https://github.com/NomicFoundation/hardhat/commit/65236d18b07abced51722b61179b12c20bc7b713) Thanks [@alcuadrado](https://github.com/alcuadrado)! - minor bump in hardhat-viem

### Patch Changes

- [\`a09c8a6\`](https://github.com/NomicFoundation/hardhat/commit/a09c8a6140ac75598d29c0b0550a36e745ffd3bb) Thanks [@alcuadrado](https://github.com/alcuadrado)! - patch bump in hardhat-ethers and hardhat-viem

- Updated dependencies [[\`01b41ee\`](https://github.com/NomicFoundation/hardhat/commit/01b41ee70fe643a3bf6f98ef5f22298e80f66e5f), [\`e37f96c\`](https://github.com/NomicFoundation/hardhat/commit/e37f96c0c1b38fca41b8645042d51a649e7f5bda), [\`bda5a0a\`](https://github.com/NomicFoundation/hardhat/commit/bda5a0a7aeaccb8246fe3cdac050cab21e772629)]:
  - @nomicfoundation/hardhat-errors@3.0.8
  - @nomicfoundation/hardhat-utils@4.0.1
  - hardhat@3.1.12

## 3.0.4

### Patch Changes

- bc193be: Use concrete value types for contract names in hardhat-viem and hardhat-ethers
`;

const HARDHAT_MOCHA_CHANGELOG = `# @nomicfoundation/hardhat-mocha

## 3.0.13

### Patch Changes

- [#8051](https://github.com/NomicFoundation/hardhat/pull/8051) [\`e37f96c\`](https://github.com/NomicFoundation/hardhat/commit/e37f96c0c1b38fca41b8645042d51a649e7f5bda) Thanks [@schaable](https://github.com/schaable)! - Add \`TestRunResult\` type that wraps \`TestSummary\`, allowing plugins to extend test results with additional data

- Updated dependencies [[\`01b41ee\`](https://github.com/NomicFoundation/hardhat/commit/01b41ee70fe643a3bf6f98ef5f22298e80f66e5f), [\`e37f96c\`](https://github.com/NomicFoundation/hardhat/commit/e37f96c0c1b38fca41b8645042d51a649e7f5bda), [\`bda5a0a\`](https://github.com/NomicFoundation/hardhat/commit/bda5a0a7aeaccb8246fe3cdac050cab21e772629)]:
  - @nomicfoundation/hardhat-errors@3.0.8
  - @nomicfoundation/hardhat-utils@4.0.1
  - hardhat@3.1.12

## 3.0.12

### Patch Changes

- 4ff11c1: Return typed result from test runners
`;

describe("bump-peers", () => {
  describe("cleanChangelogs", () => {
    describe("getLastChangelogEntry", () => {
      it("Should get the last entry of the CHANGELOG.md file", () => {
        const { entry, startIndex, endIndex } = getLastChangelogEntry(
          HARDHAT_ETHERS_CHANGELOG,
        );

        const expectedEntry = `## 4.0.7

### Patch Changes

- [\`a09c8a6\`](https://github.com/NomicFoundation/hardhat/commit/a09c8a6140ac75598d29c0b0550a36e745ffd3bb) Thanks [@alcuadrado](https://github.com/alcuadrado)! - patch bump in hardhat-ethers and hardhat-viem

- Updated dependencies [[\`01b41ee\`](https://github.com/NomicFoundation/hardhat/commit/01b41ee70fe643a3bf6f98ef5f22298e80f66e5f), [\`e37f96c\`](https://github.com/NomicFoundation/hardhat/commit/e37f96c0c1b38fca41b8645042d51a649e7f5bda), [\`bda5a0a\`](https://github.com/NomicFoundation/hardhat/commit/bda5a0a7aeaccb8246fe3cdac050cab21e772629)]:
  - @nomicfoundation/hardhat-errors@3.0.8
  - @nomicfoundation/hardhat-utils@4.0.1
  - hardhat@3.1.12

`;

        assert.equal(entry, expectedEntry);
        assert.equal(
          HARDHAT_ETHERS_CHANGELOG.slice(startIndex, endIndex),
          entry,
        );
      });

      it("Should get the last entry of the CHANGELOG.md file, even in the presence of multiple kinds of bumps", () => {
        const { entry, startIndex, endIndex } = getLastChangelogEntry(
          HARDHAT_VIEM_CHANGELOG,
        );

        const expectedEntry = `## 4.0.0

### Major Changes

- [\`65236d1\`](https://github.com/NomicFoundation/hardhat/commit/65236d18b07abced51722b61179b12c20bc7b713) Thanks [@alcuadrado](https://github.com/alcuadrado)! - major bump in hardhat-viem

### Minor Changes

- [\`65236d1\`](https://github.com/NomicFoundation/hardhat/commit/65236d18b07abced51722b61179b12c20bc7b713) Thanks [@alcuadrado](https://github.com/alcuadrado)! - minor bump in hardhat-viem

### Patch Changes

- [\`a09c8a6\`](https://github.com/NomicFoundation/hardhat/commit/a09c8a6140ac75598d29c0b0550a36e745ffd3bb) Thanks [@alcuadrado](https://github.com/alcuadrado)! - patch bump in hardhat-ethers and hardhat-viem

- Updated dependencies [[\`01b41ee\`](https://github.com/NomicFoundation/hardhat/commit/01b41ee70fe643a3bf6f98ef5f22298e80f66e5f), [\`e37f96c\`](https://github.com/NomicFoundation/hardhat/commit/e37f96c0c1b38fca41b8645042d51a649e7f5bda), [\`bda5a0a\`](https://github.com/NomicFoundation/hardhat/commit/bda5a0a7aeaccb8246fe3cdac050cab21e772629)]:
  - @nomicfoundation/hardhat-errors@3.0.8
  - @nomicfoundation/hardhat-utils@4.0.1
  - hardhat@3.1.12

`;

        assert.equal(entry, expectedEntry);
        assert.equal(HARDHAT_VIEM_CHANGELOG.slice(startIndex, endIndex), entry);
      });

      it("Should only affect the last entry", () => {
        const { startIndex, endIndex } = getLastChangelogEntry(
          HARDHAT_MOCHA_CHANGELOG,
        );

        const expectedBefore = `# @nomicfoundation/hardhat-mocha

`;
        const expectedAfter = `## 3.0.12

### Patch Changes

- 4ff11c1: Return typed result from test runners
`;

        assert.equal(
          HARDHAT_MOCHA_CHANGELOG.slice(0, startIndex),
          expectedBefore,
        );
        assert.equal(HARDHAT_MOCHA_CHANGELOG.slice(endIndex), expectedAfter);
      });
    });

    describe("Dependencies list cleanup", () => {
      it("should remove all links to Updated dependencies title, even if we didn't revert any bump", () => {
        const { entry } = getLastChangelogEntry(HARDHAT_ETHERS_CHANGELOG);
        const cleaned = cleanChangelogEntry(entry, new Set());

        const expected = `## 4.0.7

### Patch Changes

- [\`a09c8a6\`](https://github.com/NomicFoundation/hardhat/commit/a09c8a6140ac75598d29c0b0550a36e745ffd3bb) Thanks [@alcuadrado](https://github.com/alcuadrado)! - patch bump in hardhat-ethers and hardhat-viem

- Updated dependencies:
  - @nomicfoundation/hardhat-errors@3.0.8
  - @nomicfoundation/hardhat-utils@4.0.1
  - hardhat@3.1.12

`;

        assert.equal(cleaned, expected);
      });

      it("should remove the reverted bumps from the list of dependencies in the Updated dependencies sections", () => {
        const { entry } = getLastChangelogEntry(HARDHAT_VIEM_CHANGELOG);
        const reverted = new Set(["hardhat"]);
        const cleaned = cleanChangelogEntry(entry, reverted);

        const expected = `## 4.0.0

### Major Changes

- [\`65236d1\`](https://github.com/NomicFoundation/hardhat/commit/65236d18b07abced51722b61179b12c20bc7b713) Thanks [@alcuadrado](https://github.com/alcuadrado)! - major bump in hardhat-viem

### Minor Changes

- [\`65236d1\`](https://github.com/NomicFoundation/hardhat/commit/65236d18b07abced51722b61179b12c20bc7b713) Thanks [@alcuadrado](https://github.com/alcuadrado)! - minor bump in hardhat-viem

### Patch Changes

- [\`a09c8a6\`](https://github.com/NomicFoundation/hardhat/commit/a09c8a6140ac75598d29c0b0550a36e745ffd3bb) Thanks [@alcuadrado](https://github.com/alcuadrado)! - patch bump in hardhat-ethers and hardhat-viem

- Updated dependencies:
  - @nomicfoundation/hardhat-errors@3.0.8
  - @nomicfoundation/hardhat-utils@4.0.1

`;

        assert.equal(cleaned, expected);
      });

      it("should not remove the bumps that are intentionally applied from the list of dependencies in the Updated dependencies sections", () => {
        const { entry } = getLastChangelogEntry(HARDHAT_MOCHA_CHANGELOG);
        const reverted = new Set<string>();
        const cleaned = cleanChangelogEntry(entry, reverted);

        const expected = `## 3.0.13

### Patch Changes

- [#8051](https://github.com/NomicFoundation/hardhat/pull/8051) [\`e37f96c\`](https://github.com/NomicFoundation/hardhat/commit/e37f96c0c1b38fca41b8645042d51a649e7f5bda) Thanks [@schaable](https://github.com/schaable)! - Add \`TestRunResult\` type that wraps \`TestSummary\`, allowing plugins to extend test results with additional data

- Updated dependencies:
  - @nomicfoundation/hardhat-errors@3.0.8
  - @nomicfoundation/hardhat-utils@4.0.1
  - hardhat@3.1.12

`;

        assert.equal(cleaned, expected);
      });

      it('Should completely remove the "Updated dependencies" section when all dependencies are reverted', () => {
        const { entry } = getLastChangelogEntry(HARDHAT_VIEM_CHANGELOG);
        const reverted = new Set([
          "@nomicfoundation/hardhat-errors",
          "@nomicfoundation/hardhat-utils",
          "hardhat",
        ]);

        const expectedEntry = `## 4.0.0

### Major Changes

- [\`65236d1\`](https://github.com/NomicFoundation/hardhat/commit/65236d18b07abced51722b61179b12c20bc7b713) Thanks [@alcuadrado](https://github.com/alcuadrado)! - major bump in hardhat-viem

### Minor Changes

- [\`65236d1\`](https://github.com/NomicFoundation/hardhat/commit/65236d18b07abced51722b61179b12c20bc7b713) Thanks [@alcuadrado](https://github.com/alcuadrado)! - minor bump in hardhat-viem

### Patch Changes

- [\`a09c8a6\`](https://github.com/NomicFoundation/hardhat/commit/a09c8a6140ac75598d29c0b0550a36e745ffd3bb) Thanks [@alcuadrado](https://github.com/alcuadrado)! - patch bump in hardhat-ethers and hardhat-viem

`;

        const cleaned = cleanChangelogEntry(entry, reverted);
        assert.equal(cleaned, expectedEntry);
      });
    });
  });
});
