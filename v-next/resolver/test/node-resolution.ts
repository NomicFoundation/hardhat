import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { ResolutionError, resolve } from "../src/node-resolution.js";

describe("Node.js resolution", () => {
  it("Should resolve modules correctly", () => {
    const resolved = resolve({
      toResolve: "@ignored/hardhat-vnext-utils/error",
      from: import.meta.dirname,
    });

    assert.ok(
      typeof resolved === "object",
      "A successful resolution returns an object",
    );

    // We don't actually validate this behavior, we just want to make sure that
    // it finds it.
    assert.ok(
      resolved.absolutePath.includes(path.sep + "hardhat-utils" + path.sep),
      "The file is inside the hardhat-utils package",
    );
  });

  it("Should return ResolutionError.MODULE_NOT_FOUND for non-existing modules", () => {
    const resolved = resolve({
      toResolve: "fooo",
      from: import.meta.dirname,
    });

    assert.equal(resolved, ResolutionError.MODULE_NOT_FOUND);
  });

  it("Should return ResolutionError.NOT_EXPORTED for existing packages that don't export the desired module", () => {
    const resolved = resolve({
      toResolve: "@ignored/hardhat-vnext-utils/foo",
      from: import.meta.dirname,
    });

    assert.equal(resolved, ResolutionError.NOT_EXPORTED);
  });
});
