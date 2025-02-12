import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { run } from "node:test";

import { diff } from "jest-diff";

import { formatSlowTestInfo } from "../src/formatting.js";
import { hardhatTestReporter } from "../src/reporter.js";

let SHOW_OUTPUT = false;
const testOnly: string[] = [];

const argv = process.argv.slice(2);
while (argv.length > 0) {
  const key = argv.shift();
  switch (key) {
    case "--show-output":
      SHOW_OUTPUT = true;
      break;
    case "--test-only":
      const val = argv.shift();
      if (val === undefined) {
        throw new Error("Missing value for --test-only");
      }
      testOnly.push(val);
      break;
    case "--color":
    case "--no-color":
      // Ignore; this is handled by chalk
      break;
    default:
      throw new Error(`Unknown option: ${key}`);
  }
}

// Change the working directory to the root of the project
// This ensures the reported paths are relative to the project root
process.chdir(path.resolve(import.meta.dirname, ".."));

const entries = readdirSync("integration-tests/fixture-tests").filter(
  (entry) => {
    return testOnly.length === 0 || testOnly.includes(entry);
  },
);

// We need to increase the max listeners to the number of tests because
// each test adds a listener to the process.
process.setMaxListeners(entries.length);

for (const entry of entries) {
  const entryPath = `integration-tests/fixture-tests/${entry}`;

  const stats = statSync(entryPath);
  if (stats.isDirectory()) {
    console.log("Running integration test: " + entry);

    const files = readdirSync(entryPath);
    const testFiles = files
      .map((f) => entryPath + "/" + f)
      .filter((f) => statSync(f).isFile() && f.endsWith(".ts"));

    const outputChunks = [];

    let options = {};
    const optionsPath = path.join(entryPath, "options.json");
    if (existsSync(optionsPath)) {
      options = JSON.parse(readFileSync(optionsPath, "utf8"));
    }

    options = { ...options, files: testFiles };

    const reporter = hardhatTestReporter(options);

    // We disable github actions annotations, as they are misleading on PRs
    // otherwise.
    process.env.NO_GITHUB_ACTIONS_ANNOTATIONS = "true";
    const reporterStream = run(options).compose(reporter);

    for await (const chunk of reporterStream) {
      outputChunks.push(chunk);
    }

    // We're removing lines until the one that starts with "Node.js" because
    // that part of the output is not controlled by the reporter.
    const lines = outputChunks.join("").split("\n");
    const start = lines.findIndex((l) => l.startsWith("Node.js"));
    const output = lines.slice(start + 1).join("\n");

    // We're saving the actual outptu in case one needs to access it. It is .gitignored.
    writeFileSync(entryPath + "/result.actual.txt", output);
    const expectedOutput = readFileSync(entryPath + "/result.txt", "utf8");

    const normalizedOutput = normalizeOutput(entry, output);
    const normalizedExpectedOutput = normalizeOutput(entry, expectedOutput);

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

function normalizeOutput(name: string, output: string): string {
  let normalizedOutput = output;

  if (name !== "slow-test") {
    // Remove slow test info from the output
    const slowTestInfo = formatSlowTestInfo(0)
      .replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&")
      .replace("0", "\\d+");
    const slowTestRegex = new RegExp(slowTestInfo, "g");
    normalizedOutput = normalizedOutput.replace(slowTestRegex, "");
  }

  const testFileRegex = new RegExp(
    path
      .join("integration-tests", "fixture-tests", `[^${path.sep}]+`, "test.ts")
      .replaceAll("\\", "\\\\"),
    "g",
  );

  return (
    normalizedOutput
      // Normalize the time it took to run the test
      .replace(/\(\d+ms\)/g, "(Xms)")
      // Normalize windows new lines
      .replaceAll("\r\n", "\n")
      // Normalize path separators to `/` within the (file:line:column)
      // part of the stack traces
      .replaceAll(/\(.*?:\d+:\d+\)/g, (match) => {
        return match.replaceAll(path.sep, "/");
      })
      // Normalize path separators to `/` within the test file paths
      .replaceAll(testFileRegex, (match) => {
        return match.replaceAll(path.sep, "/");
      })
      // Remove lines like `at TestHook.run (node:internal/test_runner/test:1107:18)`
      .replace(/^.*?at .*? \(node\:.*?:\d+:\d+\).*?\n/gm, "")
      // Remove lines like `at node:internal/test_runner/test:776:20`
      .replace(/^.*?at (async )?node\:.*?:\d+:\d+.*?\n/gm, "")
  );
}
