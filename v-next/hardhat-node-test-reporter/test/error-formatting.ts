import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatLocation,
  formatSingleError,
  parseStackLine,
} from "../src/error-formatting.js";

const stackLineToReference = [
  {
    line: "AssertionError [ERR_ASSERTION]: Multiplication result is not correct",
    reference: undefined,
  },
  {
    line: "",
    reference: undefined,
  },
  // This is an invalid case, as it doesn't have a context, yet the location is between parens
  {
    line: "at (/home/user/project/index.js:10:7)",
    reference: undefined,
  },
  {
    line: "at /home/user/project/node_modules/express/lib/router/index.js:635:15",
    reference: {
      context: undefined,
      location: "/home/user/project/node_modules/express/lib/router/index.js",
      lineNumber: "635",
      columnNumber: "15",
    },
  },
  {
    line: "at C:\\Projects\\my-app\\controllers\\user.js:35:22",
    reference: {
      context: undefined,
      location: "C:\\Projects\\my-app\\controllers\\user.js",
      lineNumber: "35",
      columnNumber: "22",
    },
  },
  {
    line: "at file:///Users/user/project/test.js:8:10",
    reference: {
      context: undefined,
      location: "file:///Users/user/project/test.js",
      lineNumber: "8",
      columnNumber: "10",
    },
  },
  {
    line: "at file:///C:/Users/example/project/controllers/user.js:35:22",
    reference: {
      context: undefined,
      location: "file:///C:/Users/example/project/controllers/user.js",
      lineNumber: "35",
      columnNumber: "22",
    },
  },
  {
    line: "at eval (eval at new Script (vm.js:88:7), <anonymous>:1:1)",
    reference: {
      context: "eval",
      location: "eval at new Script (vm.js:88:7), <anonymous>",
      lineNumber: "1",
      columnNumber: "1",
    },
  },
  {
    line: "at <anonymous>:1:11",
    reference: {
      context: undefined,
      location: "<anonymous>",
      lineNumber: "1",
      columnNumber: "11",
    },
  },
  {
    line: "at App.<anonymous> (/Users/example/project/index.js:74:3)",
    reference: {
      context: "App.<anonymous>",
      location: "/Users/example/project/index.js",
      lineNumber: "74",
      columnNumber: "3",
    },
  },
  {
    line: "at Array.map (<anonymous>)",
    reference: {
      context: "Array.map",
      location: "<anonymous>",
      lineNumber: undefined,
      columnNumber: undefined,
    },
  },
  {
    line: "at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:109:5)",
    reference: {
      context: "async asyncRunEntryPointWithESMLoader",
      location: "node:internal/modules/run_main",
      lineNumber: "109",
      columnNumber: "5",
    },
  },
  {
    line: "at async myAsyncFunction (C:\\Projects\\my-app\\handlers\\requestHandler.js:89:3)",
    reference: {
      context: "async myAsyncFunction",
      location: "C:\\Projects\\my-app\\handlers\\requestHandler.js",
      lineNumber: "89",
      columnNumber: "3",
    },
  },
  {
    line: "at async MyClass.fetchData (file:///D:/Projects/app/models/fetchData.js:78:5)",
    reference: {
      context: "async MyClass.fetchData",
      location: "file:///D:/Projects/app/models/fetchData.js",
      lineNumber: "78",
      columnNumber: "5",
    },
  },
  {
    line: "at async Object.myFunction [as funcAlias] (file:///home/user/project/index.js:8:3)",
    reference: {
      context: "async Object.myFunction [as funcAlias]",
      location: "file:///home/user/project/index.js",
      lineNumber: "8",
      columnNumber: "3",
    },
  },
  {
    line: "at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:485:26)",
    reference: {
      context: "async onImport.tracePromise.__proto__",
      location: "node:internal/modules/esm/loader",
      lineNumber: "485",
      columnNumber: "26",
    },
  },
  {
    line: "at async Promise.all (index 1)",
    reference: {
      context: "async Promise.all",
      location: "index 1",
      lineNumber: undefined,
      columnNumber: undefined,
    },
  },
  {
    line: "at evalmachine.<anonymous>:1:1",
    reference: {
      context: undefined,
      location: "evalmachine.<anonymous>",
      lineNumber: "1",
      columnNumber: "1",
    },
  },
  {
    line: "at Function.<anonymous> (<anonymous>)",
    reference: {
      context: "Function.<anonymous>",
      location: "<anonymous>",
      lineNumber: undefined,
      columnNumber: undefined,
    },
  },
  {
    line: "at Function.<anonymous> (file:///C:/Program Files/app/index.js:7:13)",
    reference: {
      context: "Function.<anonymous>",
      location: "file:///C:/Program Files/app/index.js",
      lineNumber: "7",
      columnNumber: "13",
    },
  },
  {
    line: "at Function.Module._resolveFilename (internal/modules/cjs/loader.js:880:15)",
    reference: {
      context: "Function.Module._resolveFilename",
      location: "internal/modules/cjs/loader.js",
      lineNumber: "880",
      columnNumber: "15",
    },
  },
  {
    line: "at Function.Module.runMain (file:///C:/Program%20Files/nodejs/node_modules/npm/lib/node_modules.js:132:12)",
    reference: {
      context: "Function.Module.runMain",
      location:
        "file:///C:/Program%20Files/nodejs/node_modules/npm/lib/node_modules.js",
      lineNumber: "132",
      columnNumber: "12",
    },
  },
  {
    line: "at InternalRealm.execute (vm.js:120:12)",
    reference: {
      context: "InternalRealm.execute",
      location: "vm.js",
      lineNumber: "120",
      columnNumber: "12",
    },
  },
  {
    line: "at Layer.handle [as handle_request] (file:///C:/Users/example/project/node_modules/express/lib/router/layer.js:95:5)",
    reference: {
      context: "Layer.handle [as handle_request]",
      location:
        "file:///C:/Users/example/project/node_modules/express/lib/router/layer.js",
      lineNumber: "95",
      columnNumber: "5",
    },
  },
  {
    line: "at fileReader (utils\\readFile.js:10:3)",
    reference: {
      context: "fileReader",
      location: "utils\\readFile.js",
      lineNumber: "10",
      columnNumber: "3",
    },
  },
  {
    line: "at processData (My Folder With Spaces\\process.js:15:7)",
    reference: {
      context: "processData",
      location: "My Folder With Spaces\\process.js",
      lineNumber: "15",
      columnNumber: "7",
    },
  },
  {
    line: "at Module._compile (internal/modules/cjs/loader.js:1147:30)",
    reference: {
      context: "Module._compile",
      location: "internal/modules/cjs/loader.js",
      lineNumber: "1147",
      columnNumber: "30",
    },
  },
  {
    line: "at new <anonymous> (file:///D:/Projects/app/classes/userClass.js:3:1)",
    reference: {
      context: "new <anonymous>",
      location: "file:///D:/Projects/app/classes/userClass.js",
      lineNumber: "3",
      columnNumber: "1",
    },
  },
  {
    line: "at Script.runInThisContext (node:vm:136:12)",
    reference: {
      context: "Script.runInThisContext",
      location: "node:vm",
      lineNumber: "136",
      columnNumber: "12",
    },
  },
  {
    line: "at Timeout.setTimeout [as _onTimeout] (timers.js:250:5)",
    reference: {
      context: "Timeout.setTimeout [as _onTimeout]",
      location: "timers.js",
      lineNumber: "250",
      columnNumber: "5",
    },
  },
];

const locationToFormatted = [
  {
    location: "/home/user/project/index.js",
    base: "/home/guest/project",
    sep: "/",
    windows: false,
    formatted: "/home/user/project/index.js",
  },
  {
    location: "/home/user/project/node_modules/express/lib/router/index.js",
    base: "/home/user/project",
    sep: "/",
    formatted: "node_modules/express/lib/router/index.js",
  },
  {
    location: "<anonymous>",
    base: "/home/user/project",
    sep: "/",
    windows: false,
    formatted: "<anonymous>",
  },
  {
    location: "C:\\Projects\\my-app\\controllers\\user.js",
    base: "C:\\Projects\\my-app",
    sep: "\\",
    windows: true,
    formatted: "controllers\\user.js",
  },
  {
    location: "C:\\Projects\\my-app\\handlers\\requestHandler.js",
    base: "C:\\Projects\\My App",
    sep: "\\",
    windows: true,
    formatted: "C:\\Projects\\my-app\\handlers\\requestHandler.js",
  },
  {
    location: "file:///C:/Program Files/app/index.js",
    base: "C:\\Program Files\\app",
    sep: "\\",
    windows: true,
    formatted: "index.js",
  },
  {
    location: "file:///C:/Program%20Files/app/index.js",
    base: "C:\\Program Files\\app",
    sep: "\\",
    windows: true,
    formatted: "index.js",
  },
  {
    location: "file:///D:/Projects/app/index.js",
    base: "C:\\Program Files",
    sep: "\\",
    windows: true,
    formatted: "D:\\Projects\\app\\index.js",
  },
  {
    location: "file:///home/user/project/index.js",
    base: "/home/guest",
    sep: "/",
    windows: false,
    formatted: "/home/user/project/index.js",
  },
  {
    location: "file:///Users/example/project/index.js",
    base: "/Users/example",
    sep: "/",
    windows: false,
    formatted: "project/index.js",
  },
  {
    location: "internal/modules/cjs/loader.js",
    base: "/home/user/internal",
    sep: "/",
    windows: false,
    formatted: "internal/modules/cjs/loader.js",
  },
  {
    location: "My Folder With Spaces\\process.js",
    base: "C:\\Projects\\my-app",
    sep: "\\",
    windows: true,
    formatted: "My Folder With Spaces\\process.js",
  },
  {
    location: "node:vm",
    base: "C:\\User Profiles\\Guest",
    sep: "\\",
    windows: true,
    formatted: "node:vm",
  },
  {
    location: "eval at new Script (vm.js:88:7), <anonymous>",
    base: "C:\\Projects\\my-app",
    sep: "\\",
    windows: true,
    formatted: "eval at new Script (vm.js:88:7), <anonymous>",
  },
  {
    location: "/a/b/c/d/e/f/g",
    base: "/b/c/d",
    sep: "/",
    windows: false,
    formatted: "/a/b/c/d/e/f/g",
  },
];

describe("parseStackLine", async () => {
  stackLineToReference.forEach(({ line, reference }) => {
    it(`should parse "${line}"`, async () => {
      assert.deepEqual(parseStackLine(line), { line, reference });
    });
  });
});

describe("formatLocation", async () => {
  locationToFormatted.forEach(({ location, base, sep, windows, formatted }) => {
    it(`should format "${location}"`, async () => {
      assert.equal(formatLocation(location, base, sep, windows), formatted);
    });
  });
});

describe("Removing the diff from the error message", () => {
  function getAssertionError(a: unknown, b: unknown, message?: string) {
    try {
      assert.equal(a, b, message);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      return error;
    }

    throw new Error("Function did not throw any error");
  }

  describe("With native values", () => {
    it("Should work with the default node assert message", () => {
      const error = getAssertionError(1, 2);

      assert.equal(formatSingleError(error).includes("!=="), false);

      // This test the test itself
      assert.ok(
        error.message.includes("!=="),
        "The test checks the right diff marker",
      );
    });

    it("Should work with a custom message", () => {
      const error = getAssertionError(1, 2, "a\n b\n");

      assert.equal(formatSingleError(error).includes("!=="), false);

      const error2 = getAssertionError(1, 2, "a a as: a");

      assert.equal(formatSingleError(error2).includes("!=="), false);

      // This test the test itself
      assert.ok(
        error.message.includes("!=="),
        "The test checks the right diff marker",
      );

      assert.ok(
        error2.message.includes("!=="),
        "The test checks the right diff marker",
      );
    });
  });

  describe("With complex values", () => {
    it("Should work with the default node assert message", () => {
      const error = getAssertionError({ a: 1 }, { a: 2 });

      assert.equal(
        formatSingleError(error).includes("+ actual - expected"),
        false,
      );

      // This test the test itself
      assert.ok(
        error.message.includes("+ actual - expected"),
        "The test checks the right diff marker",
      );
    });

    it("Should work with a custom message", () => {
      const error = getAssertionError({ a: 1 }, { a: 2 }, "a\n b\n");

      assert.equal(
        formatSingleError(error).includes("+ actual - expected"),
        false,
      );

      const error2 = getAssertionError({ a: 1 }, { a: 2 }, "a a as: a");

      assert.equal(
        formatSingleError(error2).includes("+ actual - expected"),
        false,
      );

      // This test the test itself
      assert.ok(
        error.message.includes("+ actual - expected"),
        "The test checks the right diff marker",
      );

      // This test the test itself
      assert.ok(
        error2.message.includes("+ actual - expected"),
        "The test checks the right diff marker",
      );
    });
  });
});
