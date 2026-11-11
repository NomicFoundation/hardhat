import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { replaceJsExtensionsWithTs } from "../../src/internal/generate-types.js";

describe("replaceJsExtensionsWithTs", () => {
  it("should replace the '.js' extension of relative imports and re-exports", () => {
    const output = replaceJsExtensionsWithTs(`
import type * as tokens from './tokens/index.js';
import type { NonPayableOverrides } from "../../common.js"
  import type { A, AInterface } from "../../contracts/A.js";
import * as Contracts from "./index.js";
export type { A } from './A.js';
export { A__factory } from './factories/A__factory.js';
export * as factories from './factories/index.js';`);

    assert.equal(
      output,
      `
import type * as tokens from './tokens/index.ts';
import type { NonPayableOverrides } from "../../common.ts"
  import type { A, AInterface } from "../../contracts/A.ts";
import * as Contracts from "./index.ts";
export type { A } from './A.ts';
export { A__factory } from './factories/A__factory.ts';
export * as factories from './factories/index.ts';`,
    );
  });

  it("should only replace the extension at the end of the path", () => {
    const output = replaceJsExtensionsWithTs(
      `import type * as counterJs from './Counter.js/index.js';`,
    );

    assert.equal(
      output,
      `import type * as counterJs from './Counter.js/index.ts';`,
    );
  });

  it("should not replace the extension of imports from npm packages", () => {
    const input = `
import { ethers } from 'ethers';
import type { HardhatEthersHelpers } from "@nomicfoundation/hardhat-ethers/types";
import { a } from "npmPackage/file.js";
`;

    assert.equal(replaceJsExtensionsWithTs(input), input);
  });

  it("should not replace relative imports with other extensions", () => {
    const input = `
import type { A } from './A.ts';
import data from "./data.json";
`;

    assert.equal(replaceJsExtensionsWithTs(input), input);
  });
});
