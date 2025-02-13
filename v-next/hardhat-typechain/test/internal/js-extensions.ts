import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addJsExtensionsIfNeeded } from "../../src/internal/generate-types.js";

describe("addJsExtensionsIfNeeded", () => {
  it("should correctly add the '/index.js' - simulates .ts files", () => {
    const output = addJsExtensionsIfNeeded(`
import type * as counterTSol from './Counter.t.sol';
import type * as src from './src';
import * from '.';
import * as token from './token';
// Use " instead of '
import type * as counterTSol from "./Counter.t.sol";
import type * as src from "./src";
import * from ".";`);

    assert.equal(
      output,
      `
import type * as counterTSol from './Counter.t.sol/index.js';
import type * as src from './src/index.js';
import * from './index.js';
import * as token from './token/index.js';
// Use " instead of '
import type * as counterTSol from "./Counter.t.sol/index.js";
import type * as src from "./src/index.js";
import * from "./index.js";`,
    );
  });

  it("should correctly add the '/index.js' - simulate .d.ts files", () => {
    const output = addJsExtensionsIfNeeded(`
import { ethers } from "ethers";
import * from "."`);

    assert.equal(
      output,
      `
import { ethers } from "ethers";
import * from "./index.js";`,
    );
  });

  it("should not add the '/index.js' extension because it already exists", () => {
    const input = `
import * from './index.js'
import { Counter } from './Counter.js';
import type { Counter } from './Counter.js';
// Use " instead of '
import type { Counter } from "./Counter.js";
`;
    const output = addJsExtensionsIfNeeded(input);

    assert.equal(output, input);
  });

  it("should not add the '/index.js' extension because the imports is from a npm package", () => {
    const input = `
import * from 'npmPackage';
import { a } from 'npmPackage';
// Use " instead of '
import * from "npmPackage";
import { a } from "npmPackage";
`;
    const output = addJsExtensionsIfNeeded(input);

    assert.equal(output, input);
  });

  it("should not add the '/index.js' extension because there are no imports, only exports", () => {
    const input = `
export type { withForgeTSol };
export type { Counter } from './Counter';
export type { Counter } from './Counter.js';
// Use " instead of '
export { Rocket } from "./Rocket";
export { Rocket } from "./Rocket.js";`;

    const output = addJsExtensionsIfNeeded(input);

    assert.equal(output, input);
  });
});
