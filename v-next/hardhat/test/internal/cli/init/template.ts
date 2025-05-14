import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";

import { exists } from "@nomicfoundation/hardhat-utils/fs";

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

describe("template contents", () => {
  describe("templates should have valid typescript", async () => {
    const templates = await getTemplates();

    for (const template of templates) {
      it(`template ${template.name} should compile with tsc`, async () => {
        const previousCwd = process.cwd();
        try {
          process.chdir(template.path);

          const resultHardhatBuild = spawnSync("pnpm hardhat compile", {
            stdio: "inherit",
            shell: true,
          });

          assert.equal(
            resultHardhatBuild.status,
            0,
            "Template failed to compile contracts",
          );

          // We run tsc --noEmit in the template, which will throw it it fails
          const resultTscBuild = spawnSync("pnpm tsc --noEmit", {
            stdio: "inherit",
            shell: true,
          });

          assert.equal(
            resultTscBuild.status,
            0,
            "Template failed to compile its TypeScript",
          );
        } finally {
          process.chdir(previousCwd);
        }
      });
    }
  });
});
