import { readFileSync, readdirSync, statSync } from "node:fs";
import { run } from "node:test";

import { diff } from "jest-diff";

import reporter from "../src/reporter.js";
const SHOW_OUTPUT = process.argv.includes("--show-output");

for (const entry of readdirSync(import.meta.dirname + "/fixture-tests")) {
  const entryPath = import.meta.dirname + "/fixture-tests/" + entry;

  const stats = statSync(entryPath);
  if (stats.isDirectory()) {
    console.log("Running integration test: " + entry);

    const files = readdirSync(entryPath);
    const testFiles = files
      .map((f) => entryPath + "/" + f)
      .filter((f) => statSync(f).isFile() && f.endsWith(".ts"));

    const outputChunks = [];

    // We disable github actions annotations, as they are misleading on PRs
    // otherwise.
    process.env.NO_GITHUB_ACTIONS_ANNOTATIONS = "true";
    const reporterStream = run({
      files: testFiles,
    }).compose(reporter);

    for await (const chunk of reporterStream) {
      outputChunks.push(chunk);
    }

    const output = outputChunks.join("");
    const expectedOutput = readFileSync(entryPath + "/result.txt", "utf8");

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
