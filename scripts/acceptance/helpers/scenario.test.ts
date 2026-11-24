import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseScenario, scenarioCells } from "./scenario.ts";

const PATH = "/repo/acceptance/minimal/scenario.md";
const md = (...lines: string[]) => lines.join("\n");

const templated = md(
  "---",
  "packageManager: [npm, pnpm, bun]",
  "---",
  "",
  "# Initializing",
  "",
  "```sh",
  "{{runRemote}} hardhat --init --template minimal",
  "{{run}} hardhat compile",
  "```",
);

describe("parseScenario", () => {
  it("reads a literal scenario with no frontmatter", () => {
    const scenario = parseScenario(
      PATH,
      md("# Title", "", "```sh", "npx hardhat test", "```"),
    );

    assert.equal(scenario.slug, "minimal");
    assert.equal(scenario.script, "npx hardhat test");
    assert.equal(scenario.packageManagers, undefined);
  });

  it("reads the package managers of a templated scenario, in order", () => {
    assert.deepEqual(parseScenario(PATH, templated).packageManagers, [
      "npm",
      "pnpm",
      "bun",
    ]);
  });

  it("accepts block-style YAML", () => {
    const source = templated.replace(
      "packageManager: [npm, pnpm, bun]",
      "packageManager:\n  - pnpm",
    );

    assert.deepEqual(parseScenario(PATH, source).packageManagers, ["pnpm"]);
  });

  const rejects = (name: string, source: string, message: RegExp) =>
    it(`rejects ${name}`, () => {
      assert.throws(() => parseScenario(PATH, source), message);
    });

  rejects(
    "placeholders with no packageManager",
    md("```sh", "{{run}} hardhat test", "```"),
    /uses \{\{run\}\} but the frontmatter declares no packageManager/,
  );

  rejects(
    "a packageManager with no placeholders",
    md("---", "packageManager: [npm]", "---", "```sh", "npx hardhat", "```"),
    /no placeholders/,
  );

  rejects(
    "an unknown placeholder",
    templated.replace("{{run}}", "{{exec}}"),
    /Unknown placeholder \{\{exec\}\} on line 2 of the script/,
  );

  rejects(
    "an unsupported package manager",
    templated.replace("[npm, pnpm, bun]", "[npm, yarn]"),
    /Unsupported package manager "yarn"; the supported ones are npm, pnpm, bun/,
  );

  rejects(
    "a package manager listed twice",
    templated.replace("[npm, pnpm, bun]", "[npm, npm]"),
    /lists "npm" twice/,
  );

  rejects(
    "an empty list",
    templated.replace("[npm, pnpm, bun]", "[]"),
    /must be a non-empty list/,
  );

  rejects(
    "a single value rather than a list",
    templated.replace("[npm, pnpm, bun]", "npm"),
    /must be a non-empty list/,
  );

  rejects(
    "an unknown frontmatter key",
    templated.replace("packageManager:", "template: minimal\npackageManager:"),
    /Unknown frontmatter key "template"/,
  );

  rejects(
    "frontmatter that is not a mapping",
    templated.replace("packageManager: [npm, pnpm, bun]", "- npm"),
    /must be a mapping/,
  );

  rejects(
    "frontmatter that is not YAML",
    templated.replace("[npm, pnpm, bun]", "[npm, pnpm"),
    /not valid YAML/,
  );
});

describe("scenarioCells", () => {
  it("runs a literal scenario once, as written", () => {
    const scenario = parseScenario(
      PATH,
      md("```sh", "npx hardhat test", "```"),
    );

    assert.deepEqual(scenarioCells(scenario), [
      {
        slug: "minimal",
        label: "minimal",
        directory: "minimal",
        packageManager: undefined,
        script: "npx hardhat test",
      },
    ]);
  });

  it("expands a templated scenario into one cell per package manager", () => {
    const cells = scenarioCells(parseScenario(PATH, templated));

    assert.deepEqual(
      cells.map(({ label, directory, packageManager, script }) => ({
        label,
        directory,
        packageManager,
        script,
      })),
      [
        {
          label: "minimal [npm]",
          directory: "minimal/npm",
          packageManager: "npm",
          script: "npx hardhat --init --template minimal\nnpx hardhat compile",
        },
        {
          label: "minimal [pnpm]",
          directory: "minimal/pnpm",
          packageManager: "pnpm",
          script:
            "pnpm dlx hardhat --init --template minimal\npnpm hardhat compile",
        },
        {
          label: "minimal [bun]",
          directory: "minimal/bun",
          packageManager: "bun",
          script:
            "bunx hardhat --init --template minimal\nbunx hardhat compile",
        },
      ],
    );
  });
});
