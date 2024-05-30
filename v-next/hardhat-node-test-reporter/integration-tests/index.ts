import { run } from "node:test";

import {
  isDirectory,
  readdir,
  getAllFilesMatching,
  readUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import { diff } from "jest-diff";

import reporter from "../src/reporter.js";
const SHOW_OUTPUT = process.argv.includes("--show-output");

for (const entry of await readdir(import.meta.dirname + "/fixture-tests")) {
  const entryPath = import.meta.dirname + "/fixture-tests/" + entry;
  if (await isDirectory(entryPath)) {
    console.log("Running integration test: " + entry);

    const testFiles = await getAllFilesMatching(entryPath, (file) =>
      file.endsWith(".ts"),
    );

    const outputChunks = [];

    const reporterStream = run({
      files: testFiles,
    }).compose(reporter);

    for await (const chunk of reporterStream) {
      outputChunks.push(chunk);
    }

    const output = outputChunks.join("");
    const expectedOutput = await readUtf8File(entryPath + "/result.txt");

    const normalizedOutput = normalizeOutputs(output);
    const normalizedExpectedOutput = normalizeOutputs(expectedOutput);

    if (normalizedOutput !== normalizedExpectedOutput) {
      console.log("Normalized outputs differ:");
      console.log(diff(normalizedExpectedOutput, normalizedOutput));
      process.exitCode = 1;
    } else {
      console.log("   Passed");
    }

    if (SHOW_OUTPUT) {
      console.log();
      console.log();
      console.log(output);
    }

    console.log();
    console.log();
    console.log();
    console.log();
  }
}

function normalizeOutputs(output: string): string {
  return output.replace(/\(\d+ms\)/, "(Xms)").replaceAll("\r\n", "\n");
}
