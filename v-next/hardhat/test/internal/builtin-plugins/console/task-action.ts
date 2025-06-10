// import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";
// import type repl from "node:repl";

// import assert from "node:assert/strict";
// import path from "node:path";
// import { PassThrough } from "node:stream";
// import { afterEach, before, beforeEach, describe, it } from "node:test";

// import {
//   getTmpDir,
//   useFixtureProject,
// } from "@nomicfoundation/hardhat-test-utils";
// import { ensureError } from "@nomicfoundation/hardhat-utils/error";
// import { exists, remove } from "@nomicfoundation/hardhat-utils/fs";
// import debug from "debug";

// import consoleAction from "../../../../src/internal/builtin-plugins/console/task-action.js";
// import { createHardhatRuntimeEnvironment } from "../../../../src/internal/hre-initialization.js";

// const log = debug("hardhat:test:console:task-action");

// //
// // Just a random comment
// //

// describe("console/task-action", function () {
//   let hre: HardhatRuntimeEnvironment;
//   let options: repl.ReplOptions;

//   before(async function () {
//     hre = await createHardhatRuntimeEnvironment({});
//   });

//   beforeEach(function () {
//     // Using process.stdin for the input during tests is not reliable as it
//     // causes the test runner to hang indefinitely. We use a PassThrough stream
//     // instead. This, in turn, prevents us from using process.stdout for output.
//     // Hence, we use a PassThrough stream for output as well.
//     const input = new PassThrough();
//     const output = new PassThrough();
//     options = {
//       input,
//       output,
//     };
//   });

//   describe("javascript", function () {
//     useFixtureProject("run-js-script");

//     it("should throw inside the console if script does not exist", async function () {
//       const replServer = await consoleAction(
//         {
//           commands: ['await import("./scripts/non-existent.js");', ".exit"],
//           history: "",
//           noCompile: true,
//           options,
//         },
//         hre,
//       );
//       ensureError(replServer.lastError);
//     });

//     it("should run a script inside the console successfully", async function () {
//       const replServer = await consoleAction(
//         {
//           commands: [".help", 'await import("./scripts/success.js");', ".exit"],
//           history: "",
//           noCompile: true,
//           options,
//         },
//         hre,
//       );
//       assert.equal(replServer.lastError, undefined);
//     });

//     it("should throw inside the console if the script throws", async function () {
//       const replServer = await consoleAction(
//         {
//           commands: ['await import("./scripts/throws.js");', ".exit"],
//           history: "",
//           noCompile: true,
//           options,
//         },
//         hre,
//       );
//       ensureError(replServer.lastError);
//     });
//   });

//   describe("typescript", function () {
//     useFixtureProject("run-ts-script");

//     it("should throw inside the console if script does not exist", async function () {
//       const replServer = await consoleAction(
//         {
//           commands: ['await import("./scripts/non-existent.ts");', ".exit"],
//           history: "",
//           noCompile: true,
//           options,
//         },
//         hre,
//       );
//       ensureError(replServer.lastError);
//     });

//     it("should run a script inside the console successfully", async function () {
//       const replServer = await consoleAction(
//         {
//           commands: ['await import("./scripts/success.ts");', ".exit"],
//           history: "",
//           noCompile: true,
//           options,
//         },
//         hre,
//       );
//       assert.equal(replServer.lastError, undefined);
//     });

//     it("should throw inside the console if the script throws", async function () {
//       const replServer = await consoleAction(
//         {
//           commands: ['await import("./scripts/throws.ts");', ".exit"],
//           history: "",
//           noCompile: true,
//           options,
//         },
//         hre,
//       );
//       ensureError(replServer.lastError);
//     });
//   });

//   describe("context", function () {
//     it("should expose the Hardhat Runtime Environment", async function () {
//       const replServer = await consoleAction(
//         {
//           commands: ["console.log(hre);", ".exit"],
//           history: "",
//           noCompile: true,
//           options,
//         },
//         hre,
//       );
//       assert.equal(replServer.lastError, undefined);
//     });
//   });

//   describe("history", function () {
//     let cacheDir: string;
//     let history: string;

//     beforeEach(async function () {
//       // We use a temporary cache dir to avoid conflicts with other tests
//       // and global user settings.
//       cacheDir = await getTmpDir("console-action-test");
//       history = path.resolve(cacheDir, "console-history.txt");
//     });

//     afterEach(async function () {
//       // We try to remove the temporary cache dir after each test, but we don't
//       // fail the test if it fails. For example, we have observed that in GHA
//       // on Windows, the temp dir cannot be removed due to permission issues.
//       try {
//         await remove(cacheDir);
//       } catch (error) {
//         log("Failed to remove temporary cache dir", error);
//       }
//     });

//     it("should create a history file", async function () {
//       let historyExists = await exists(history);
//       assert.ok(
//         !historyExists,
//         "History file exists before running the console",
//       );
//       const replServer = await consoleAction(
//         {
//           commands: [".help", ".exit"],
//           history,
//           noCompile: true,
//           options,
//         },
//         hre,
//       );
//       assert.equal(replServer.lastError, undefined);
//       historyExists = await exists(history);
//       assert.ok(
//         historyExists,
//         "History file does not exist after running the console",
//       );
//     });
//   });
// });
