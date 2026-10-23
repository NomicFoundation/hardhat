import type { SolidityHooks } from "../../../../../../src/types/hooks.js";
import type { HardhatPlugin } from "../../../../../../src/types/plugins.js";
import type { BuildScope } from "../../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { FileBuildResultType } from "../../../../../../src/types/solidity.js";
import { useTestProjectTemplate } from "../resolver/helpers.js";

const projectTemplate = {
  name: "root-file-hooks",
  version: "1.0.0",
  files: {
    "contracts/Control.sol": "",
    "contracts/Control.t.sol": "",
    "contracts/Answer.yul": 'object "Answer" { code { stop() } }',
    "contracts/Answer.t.yul": 'object "AnswerTest" { code { stop() } }',
    "contracts/ignored.txt": "",
    "extra/Nested.yul": 'object "Nested" { code { stop() } }',
    "test/Control.sol": "",
    "test/Answer.yul": 'object "TestAnswer" { code { stop() } }',
  },
};

function makePlugin(
  handlers: Partial<SolidityHooks>,
  id = "test-root-file-hooks",
): HardhatPlugin {
  return {
    id,
    hookHandlers: {
      solidity: async () => ({ default: async () => handlers }),
    },
  };
}

// Reuse the default scope rules by delegating with a Solidity suffix.
const yulHandlers: Partial<SolidityHooks> = {
  isRootFile: async (context, fsPath, next) =>
    fsPath.endsWith(".yul") || (await next(context, fsPath)),
  getScope: async (context, fsPath, next) =>
    await next(context, fsPath.replace(/\.yul$/, ".sol")),
};

function relativePaths(projectPath: string, roots: string[]): string[] {
  return roots.map((root) => path.relative(projectPath, root)).sort();
}

const defaultContracts = ["contracts/Control.sol"];
const defaultTests = ["contracts/Control.t.sol", "test/Control.sol"];
const yulContracts = ["contracts/Answer.yul", "extra/Nested.yul"];
const yulTests = ["contracts/Answer.t.yul", "test/Answer.yul"];

describe("solidity root discovery hooks", () => {
  for (const splitTestsCompilation of [true, false]) {
    describe(`splitTestsCompilation: ${splitTestsCompilation}`, () => {
      it("preserves default discovery and npm roots without custom handlers", async () => {
        await using project = await useTestProjectTemplate(projectTemplate);
        const hre = await project.getHRE({
          solidity: {
            version: "0.8.19",
            splitTestsCompilation,
            npmFilesToBuild: ["dependency/Root.sol", "dependency/Root.sol"],
          },
        });

        const roots = await hre.solidity.getRootFilePaths();
        assert.ok(
          roots.includes("npm:dependency/Root.sol"),
          "npm roots should be preserved",
        );
        assert.equal(
          roots.filter((root) => root === "npm:dependency/Root.sol").length,
          splitTestsCompilation ? 2 : 1,
          "unified discovery should continue deduplicating npm roots",
        );
        assert.deepEqual(
          relativePaths(
            project.path,
            roots.filter((root) => !root.startsWith("npm:")),
          ),
          [
            ...defaultContracts,
            ...(splitTestsCompilation ? [] : defaultTests),
          ].sort(),
        );
        if (splitTestsCompilation) {
          assert.deepEqual(
            relativePaths(
              project.path,
              await hre.solidity.getRootFilePaths({ scope: "tests" }),
            ),
            defaultTests,
          );
        }
      });

      it("discovers custom roots in every source directory and classifies test roots", async () => {
        await using project = await useTestProjectTemplate(projectTemplate);
        const hre = await project.getHRE({
          plugins: [makePlugin(yulHandlers)],
          paths: { sources: { solidity: ["contracts", "extra"] } },
          solidity: { version: "0.8.19", splitTestsCompilation },
        });

        assert.deepEqual(
          relativePaths(project.path, await hre.solidity.getRootFilePaths()),
          [
            ...defaultContracts,
            ...yulContracts,
            ...(splitTestsCompilation ? [] : [...defaultTests, ...yulTests]),
          ].sort(),
        );
        if (splitTestsCompilation) {
          assert.deepEqual(
            relativePaths(
              project.path,
              await hre.solidity.getRootFilePaths({ scope: "tests" }),
            ),
            [...defaultTests, ...yulTests].sort(),
          );
        }
        for (const file of yulTests) {
          assert.equal(
            await hre.solidity.getScope(path.join(project.path, file)),
            "tests",
          );
        }
      });

      it("deduplicates overlapping paths and respects source precedence", async () => {
        await using project = await useTestProjectTemplate(projectTemplate);
        const hre = await project.getHRE({
          plugins: [makePlugin(yulHandlers)],
          paths: { sources: { solidity: ["contracts", "contracts", "test"] } },
          solidity: { version: "0.8.19", splitTestsCompilation },
        });
        const contracts = [
          "contracts/Answer.yul",
          "contracts/Control.sol",
          "test/Answer.yul",
          "test/Control.sol",
        ];
        const tests = ["contracts/Answer.t.yul", "contracts/Control.t.sol"];
        assert.deepEqual(
          relativePaths(project.path, await hre.solidity.getRootFilePaths()),
          [...contracts, ...(splitTestsCompilation ? [] : tests)].sort(),
        );
        if (splitTestsCompilation) {
          assert.deepEqual(
            relativePaths(
              project.path,
              await hre.solidity.getRootFilePaths({ scope: "tests" }),
            ),
            tests,
          );
        }
      });

      it("passes discovered and explicit custom roots to the build hook with the same scope", async () => {
        await using project = await useTestProjectTemplate(projectTemplate);
        const builds: Array<{
          scope: BuildScope | undefined;
          roots: string[];
        }> = [];
        const hre = await project.getHRE({
          plugins: [
            makePlugin({
              ...yulHandlers,
              build: async (_context, roots, options) => {
                builds.push({
                  scope: options?.scope,
                  roots: relativePaths(project.path, roots),
                });
                // Capture task routing without invoking the Solidity compiler.
                return new Map(
                  roots.map((root) => [
                    root,
                    {
                      type: FileBuildResultType.CACHE_HIT,
                      buildId: "test-build",
                      contractArtifactsGenerated: [],
                    },
                  ]),
                );
              },
            }),
          ],
          solidity: { version: "0.8.19", splitTestsCompilation },
        });
        await hre.tasks.getTask("build").run();
        assert.ok(
          builds.some(({ roots }) => roots.includes("contracts/Answer.yul")),
          "the build hook should receive discovered Yul contracts",
        );
        assert.ok(
          builds.some(
            ({ roots, scope }) =>
              roots.includes("test/Answer.yul") &&
              scope === (splitTestsCompilation ? "tests" : "contracts"),
          ),
          "the build hook should receive discovered Yul tests in the correct scope",
        );

        builds.length = 0;
        await hre.tasks
          .getTask("build")
          .run({ files: [path.join(project.path, "test/Answer.yul")] });
        assert.deepEqual(builds, [
          {
            scope: splitTestsCompilation ? "tests" : "contracts",
            roots: ["test/Answer.yul"],
          },
        ]);

        builds.length = 0;
        await hre.tasks.getTask("build").run({ noTests: true });
        assert.ok(
          builds.flatMap(({ roots }) => roots).includes("contracts/Answer.yul"),
          "--no-tests should retain Yul contracts",
        );
        assert.ok(
          !builds.flatMap(({ roots }) => roots).includes("test/Answer.yul"),
          "--no-tests should exclude Yul tests",
        );

        builds.length = 0;
        await hre.tasks.getTask("build").run({ noContracts: true });
        assert.ok(
          builds.flatMap(({ roots }) => roots).includes("test/Answer.yul"),
          "--no-contracts should retain Yul tests",
        );
        assert.ok(
          !builds
            .flatMap(({ roots }) => roots)
            .includes("contracts/Answer.yul"),
          "--no-contracts should exclude Yul contracts",
        );

        await assertRejectsWithHardhatError(
          hre.tasks.getTask("build").run({
            files: [path.join(project.path, "test/Answer.yul")],
            noTests: true,
          }),
          HardhatError.ERRORS.CORE.SOLIDITY.INCOMPATIBLE_FILES_WITH_BUILD_FLAGS,
          { files: `- ${path.join(project.path, "test/Answer.yul")}` },
        );
      });
    });
  }

  it("allows chained handlers to exclude both Solidity and custom roots", async () => {
    await using project = await useTestProjectTemplate(projectTemplate);
    const seen: string[] = [];
    const hre = await project.getHRE({
      plugins: [
        makePlugin(yulHandlers),
        makePlugin(
          {
            isRootFile: async (context, fsPath, next) => {
              assert.equal(context.config.paths.root, project.path);
              assert.ok(
                path.isAbsolute(fsPath),
                "discovery should provide absolute paths",
              );
              seen.push(fsPath);
              const accepted = await next(context, fsPath);
              return (
                accepted &&
                !fsPath.endsWith("Control.sol") &&
                !fsPath.endsWith("Answer.yul")
              );
            },
          },
          "test-exclude-roots",
        ),
      ],
      solidity: "0.8.19",
    });
    assert.deepEqual(
      relativePaths(project.path, await hre.solidity.getRootFilePaths()),
      ["contracts/Answer.t.yul", "contracts/Control.t.sol"],
    );
    assert.ok(
      seen.some((file) => file.endsWith("ignored.txt")),
      "the hook should see files before extension filtering",
    );
  });

  it("uses the path passed to next in the default isRootFile handler", async () => {
    await using project = await useTestProjectTemplate(projectTemplate);
    const hre = await project.getHRE({
      plugins: [
        makePlugin({
          isRootFile: async (context, fsPath, next) =>
            await next(context, fsPath.replace(/\.yul$/, ".sol")),
        }),
      ],
      solidity: "0.8.19",
    });
    assert.ok(
      (await hre.solidity.getRootFilePaths()).includes(
        path.join(project.path, "contracts/Answer.yul"),
      ),
      "the default predicate should use the path passed to next",
    );
  });

  it("discovers contracts classified by a plugin under the tests directory", async () => {
    await using project = await useTestProjectTemplate(projectTemplate);
    const hre = await project.getHRE({
      plugins: [
        makePlugin({
          ...yulHandlers,
          getScope: async (context, fsPath, next) =>
            fsPath.endsWith(".yul") ? "contracts" : await next(context, fsPath),
        }),
      ],
      solidity: { version: "0.8.19", splitTestsCompilation: true },
    });
    assert.ok(
      (await hre.solidity.getRootFilePaths()).includes(
        path.join(project.path, "test/Answer.yul"),
      ),
      "a custom contract under the tests path should be discovered as a contract",
    );
    assert.ok(
      !(await hre.solidity.getRootFilePaths({ scope: "tests" })).some((file) =>
        file.endsWith(".yul"),
      ),
      "custom contracts should not also appear in test roots",
    );
  });

  it("propagates discovery hook errors", async () => {
    await using project = await useTestProjectTemplate(projectTemplate);
    const error = new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY.BUILD_FAILED,
    );
    const hre = await project.getHRE({
      plugins: [
        makePlugin({
          isRootFile: async () => {
            throw error;
          },
        }),
      ],
      solidity: "0.8.19",
    });
    await assertRejectsWithHardhatError(
      hre.solidity.getRootFilePaths(),
      HardhatError.ERRORS.CORE.SOLIDITY.BUILD_FAILED,
      {},
    );
  });
});
