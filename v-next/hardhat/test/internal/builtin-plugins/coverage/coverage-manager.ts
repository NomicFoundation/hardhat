import type { CoverageMetadata } from "../../../../src/internal/builtin-plugins/coverage/types.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { useTmpDir } from "@nomicfoundation/hardhat-test-utils";
import { getAllFilesMatching } from "@nomicfoundation/hardhat-utils/fs";

import { CoverageManagerImplementation } from "../../../../src/internal/builtin-plugins/coverage/coverage-manager.js";

describe("CoverageManagerImplementation", () => {
  let coverageManager: CoverageManagerImplementation;

  useTmpDir();

  beforeEach(async () => {
    coverageManager = new CoverageManagerImplementation(process.cwd());
  });

  it("should load all the saved data", async () => {
    const data1 = ["a", "b", "c"];
    const data2 = ["1", "2", "3"];

    const coverageManager1 = new CoverageManagerImplementation(process.cwd());
    const coverageManager2 = new CoverageManagerImplementation(process.cwd());

    await coverageManager1.addData(data1);
    await coverageManager1.saveData();

    await coverageManager2.addData(data2);
    await coverageManager2.saveData();

    await coverageManager.loadData();

    const data = await coverageManager.getData();

    for (const item of [...data1, ...data2]) {
      assert.ok(data.includes(item), `The loaded data should include ${item}`);
    }
  });

  it("should store all the metadata", async () => {
    const metadata1: CoverageMetadata = [
      {
        sourceName: "test1",
        tag: "test1",
        kind: "test",
        startUtf16: 1,
        endUtf16: 1,
      },
    ];
    const metadata2: CoverageMetadata = [
      {
        sourceName: "test2",
        tag: "test2",
        kind: "test",
        startUtf16: 1,
        endUtf16: 1,
      },
    ];

    await coverageManager.addMetadata(metadata1);
    await coverageManager.addMetadata(metadata2);

    const metadata = await coverageManager.getMetadata();

    for (const item of [...metadata1, ...metadata2]) {
      assert.ok(
        metadata.some((i) => i.tag === item.tag),
        `The loaded metadata should include ${item.tag}`,
      );
    }
  });

  it("should clear the data from memory", async () => {
    await coverageManager.addData(["a", "b", "c"]);

    let data = await coverageManager.getData();

    assert.ok(data.length !== 0, "The data should be saved to memory");

    await coverageManager.clearData();

    data = await coverageManager.getData();

    assert.ok(data.length === 0, "The data should be cleared from memory");
  });

  it("should clear the data from disk", async () => {
    await coverageManager.addData(["a", "b", "c"]);
    await coverageManager.saveData();

    let data = await getAllFilesMatching(process.cwd());

    assert.ok(data.length !== 0, "The data should be saved to disk");

    await coverageManager.clearData();

    data = await getAllFilesMatching(process.cwd());

    assert.ok(data.length === 0, "The data should be cleared from disk");
  });

  it("should not clear the metadata", async () => {
    await coverageManager.addMetadata([
      {
        sourceName: "test",
        tag: "test",
        kind: "test",
        startUtf16: 1,
        endUtf16: 1,
      },
    ]);

    let metadata = await coverageManager.getMetadata();

    assert.ok(metadata.length !== 0, "The metadata should be saved to memory");

    await coverageManager.clearData();

    metadata = await coverageManager.getMetadata();

    assert.ok(
      metadata.length !== 0,
      "The metadata should not be cleared from memory",
    );
  });
});
