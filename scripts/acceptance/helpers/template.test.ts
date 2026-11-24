import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { expandTemplate, findPlaceholders } from "./template.ts";

describe("findPlaceholders", () => {
  it("finds none in a literal script", () => {
    assert.deepEqual(findPlaceholders("npx hardhat compile"), []);
  });

  it("finds each placeholder with its line", () => {
    assert.deepEqual(
      findPlaceholders(
        "{{runRemote}} hardhat --init\n\n{{run}} hardhat {{ run }}",
      ),
      [
        { name: "runRemote", line: 1 },
        { name: "run", line: 3 },
        { name: "run", line: 3 },
      ],
    );
  });

  it("leaves shell syntax that is not a placeholder alone", () => {
    assert.deepEqual(findPlaceholders('echo "${HOME}" { a; }'), []);
  });
});

describe("expandTemplate", () => {
  const values = { run: "pnpm", runRemote: "pnpm dlx" };

  it("replaces every placeholder", () => {
    assert.equal(
      expandTemplate(
        "{{runRemote}} hardhat --init\n{{ run }} hardhat test",
        values,
      ),
      "pnpm dlx hardhat --init\npnpm hardhat test",
    );
  });

  it("returns a literal script unchanged", () => {
    assert.equal(
      expandTemplate("npx hardhat test", values),
      "npx hardhat test",
    );
  });

  it("throws on an unknown name rather than leaving it in place", () => {
    assert.throws(
      () => expandTemplate("{{runRemoet}} hardhat", values),
      /Unknown placeholder \{\{runRemoet\}\}/,
    );
  });
});
