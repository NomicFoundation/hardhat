import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selectScenarioPaths } from "./select.ts";

const paths = [
  "/repo/acceptance/minimal/scenario.md",
  "/repo/acceptance/mocha-ethers/scenario.md",
];

describe("selectScenarioPaths", () => {
  it("returns everything when no scenario is named", () => {
    assert.deepEqual(selectScenarioPaths(paths, undefined), paths);
  });

  it("selects by slug", () => {
    assert.deepEqual(selectScenarioPaths(paths, "minimal"), [paths[0]]);
  });

  it("selects by directory path", () => {
    assert.deepEqual(selectScenarioPaths(paths, "./acceptance/minimal"), [
      paths[0],
    ]);
  });

  it("selects by path to the scenario file", () => {
    assert.deepEqual(
      selectScenarioPaths(paths, "./acceptance/minimal/scenario.md"),
      [paths[0]],
    );
  });

  it("lists the available scenarios when the name is unknown", () => {
    assert.throws(
      () => selectScenarioPaths(paths, "nope"),
      /No scenario named "nope"[\s\S]*minimal[\s\S]*mocha-ethers/,
    );
  });

  it("throws when there are no scenarios at all", () => {
    assert.throws(
      () => selectScenarioPaths([], undefined),
      /No scenarios found/,
    );
  });
});
