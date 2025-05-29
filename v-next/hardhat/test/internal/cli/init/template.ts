import type { Template } from "../../../../src/internal/cli/init/template.js";

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { exists, remove } from "@nomicfoundation/hardhat-utils/fs";

import { getTemplates } from "../../../../src/internal/cli/init/template.js";

describe("getTemplates", () => {
  it("should return a non-empty array of templates", async () => {
    const templates = await getTemplates();
    assert.ok(templates.length > 0, "No templates found");
  });
  it("should ensure the templates have unique names", async () => {
    const templates = await getTemplates();
    const names = templates.map((t) => t.name);
    assert.ok(
      new Set(names).size === names.length,
      `Duplicate names found: ${names.join(", ")}`,
    );
  });
  it("should ensure the template files exist", async () => {
    const templates = await getTemplates();
    for (const template of templates) {
      for (const file of template.files) {
        const pathToTemplateFile = path.join(template.path, file);
        assert.ok(
          await exists(pathToTemplateFile),
          `Template file ${file} does not exist`,
        );
      }
    }
  });
});

describe("template contents", async () => {
  async function useTemplateHardhatProject(
    template: Template,
  ): Promise<() => Promise<void>> {
    const previousCwd = process.cwd();
    process.chdir(template.path);

    async function cleanup() {
      process.chdir(previousCwd);

      // Remove all the files that `hardhat compile` may have created
      const toRemove = ["artifacts", "cache", "types"];
      for (const file of toRemove) {
        const filePath = path.join(template.path, file);
        if (await exists(filePath)) {
          await remove(filePath);
        }
      }
    }

    try {
      const resultHardhatBuild = spawnSync("pnpm hardhat compile", {
        stdio: "inherit",
        shell: true,
      });

      assert.equal(
        resultHardhatBuild.status,
        0,
        `Template ${template.name}: hardhat compile failed`,
      );
    } catch (error) {
      await cleanup();
      throw error;
    }

    return cleanup;
  }

  const templates = await getTemplates();

  for (const template of templates) {
    describe(`template ${template.name}`, async () => {
      let cleanup: () => Promise<void> | undefined;
      before(async () => {
        cleanup = await useTemplateHardhatProject(template);
      });

      it(`should compile with tsc`, async () => {
        // We run tsc --noEmit in the template
        const resultTscBuild = spawnSync("pnpm tsc --noEmit", {
          stdio: "inherit",
          shell: true,
        });

        assert.equal(
          resultTscBuild.status,
          0,
          `Template ${template.name}: tsc --noEmit failed`,
        );
      });

      it(`should pass the hardhat tests`, async () => {
        const hardhatTest = spawnSync("pnpm hardhat test", {
          stdio: "inherit",
          shell: true,
          env: {
            ...process.env,
            // We override the NODE_TEST_CONTEXT environment variable to
            // ensure that `node:test` runs in the subprocess, otherwise it
            // will be disabled automatically
            NODE_TEST_CONTEXT: undefined,
          },
        });

        assert.equal(
          hardhatTest.status,
          0,
          `Template ${template.name}: hardhat test failed`,
        );
      });

      after(async () => {
        await cleanup?.();
      });
    });
  }
});
