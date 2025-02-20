import assert from "node:assert/strict";
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
