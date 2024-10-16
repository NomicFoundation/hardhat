import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { ResolutionError, resolve } from "../src/resolve.js";

describe("Node.js resolution", () => {
  it("Should resolve modules correctly", () => {
    const resolved = resolve(
      "@ignored/hardhat-vnext-utils/error",
      import.meta.dirname,
    );

    assert.ok(resolved.success, "A successful resolution returns an object");

    // We don't actually validate this behavior, we just want to make sure that
    // it finds it.
    assert.ok(
      resolved.absolutePath.includes(path.sep + "hardhat-utils" + path.sep),
      "The file is inside the hardhat-utils package",
    );
  });

  it("Should return ResolutionError.MODULE_NOT_FOUND for non-existing packages", () => {
    const resolved = resolve("fooo", import.meta.dirname);

    assert.equal(resolved.success, false);
    assert.equal(resolved.error, ResolutionError.MODULE_NOT_FOUND);
  });

  it("Should return ResolutionError.MODULE_NOT_FOUND for non-existing modules of existing packages", () => {
    // Note: If this test fails after upgrading the version of the package below
    // you should pick a different one that doesn't use #exports
    const resolved = resolve("undici/foo", import.meta.dirname);

    assert.equal(resolved.success, false);
    assert.equal(resolved.error, ResolutionError.MODULE_NOT_FOUND);
  });

  it("Should return ResolutionError.NOT_EXPORTED for existing packages that don't export the desired module", () => {
    const resolved = resolve(
      "@ignored/hardhat-vnext-utils/foo",
      import.meta.dirname,
    );

    assert.equal(resolved.success, false);
    assert.equal(resolved.error, ResolutionError.NOT_EXPORTED);
  });

  it("Should be able to finde from a different directory", () => {
    const fixtureProjectPath = path.join(
      import.meta.dirname,
      "fixture-projects",
      "resolve-fixture",
    );

    const resolved = resolve("dep/package.json", fixtureProjectPath);
    assert.ok(resolved.success, "A successful resolution returns an object");
    assert.equal(
      resolved.absolutePath,
      path.join(fixtureProjectPath, "node_modules/dep/package.json"),
    );

    // It shouldn't find it in this directory
    const notResolved = resolve("dep/package.json", import.meta.dirname);
    assert.ok(!notResolved.success, "A failed resolution returns an object");
    assert.equal(notResolved.error, ResolutionError.MODULE_NOT_FOUND);
  });
});
