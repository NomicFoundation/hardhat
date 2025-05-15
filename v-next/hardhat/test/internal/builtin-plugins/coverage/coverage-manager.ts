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

    await coverageManager1.handleData(data1);
    await coverageManager1.handleTestWorkerDone();

    await coverageManager2.handleData(data2);
    await coverageManager2.handleTestWorkerDone();

    await coverageManager.handleTestRunDone();

    const data = coverageManager.data;

    for (const item of [...data1, ...data2]) {
      assert.ok(data.includes(item), `The loaded data should include ${item}`);
    }
  });

  it("should store all the metadata", async () => {
    const metadata1: CoverageMetadata = [
      {
        sourceName: "test1",
        tag: "test1",
        startLine: 1,
        endLine: 1,
      },
    ];
    const metadata2: CoverageMetadata = [
      {
        sourceName: "test2",
        tag: "test2",
        startLine: 1,
        endLine: 1,
      },
    ];

    await coverageManager.handleMetadata(metadata1);
    await coverageManager.handleMetadata(metadata2);

    const metadata = coverageManager.metadata;

    for (const item of [...metadata1, ...metadata2]) {
      assert.ok(
        metadata.some((i) => i.tag === item.tag),
        `The loaded metadata should include ${item.tag}`,
      );
    }
  });

  it("should clear the data from memory", async () => {
    await coverageManager.handleData(["a", "b", "c"]);

    let data = coverageManager.data;

    assert.ok(data.length !== 0, "The data should be saved to memory");

    await coverageManager.handleTestRunStart();

    data = coverageManager.data;

    assert.ok(data.length === 0, "The data should be cleared from memory");
  });

  it("should clear the data from disk", async () => {
    await coverageManager.handleData(["a", "b", "c"]);
    await coverageManager.handleTestWorkerDone();

    let data = await getAllFilesMatching(process.cwd());

    assert.ok(data.length !== 0, "The data should be saved to disk");

    await coverageManager.handleTestRunStart();

    data = await getAllFilesMatching(process.cwd());

    assert.ok(data.length === 0, "The data should be cleared from disk");
  });

  it("should not clear the metadata", async () => {
    await coverageManager.handleMetadata([
      {
        sourceName: "test",
        tag: "test",
        startLine: 1,
        endLine: 1,
      },
    ]);

    let metadata = coverageManager.metadata;

    assert.ok(metadata.length !== 0, "The metadata should be saved to memory");

    await coverageManager.handleTestRunStart();

    metadata = coverageManager.metadata;

    assert.ok(
      metadata.length !== 0,
      "The metadata should not be cleared from memory",
    );
  });
});
