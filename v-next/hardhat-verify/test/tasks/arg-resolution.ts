import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  resolveConstructorArgs,
  resolveLibraries,
} from "../../src/internal/tasks/arg-resolution.js";

describe("resolveConstructorArgs", () => {
  const validArgsModule =
    "./test/fixture-projects/load-module/constructor-args-valid.ts";
  const noDefaultModule =
    "./test/fixture-projects/load-module/no-default-export.ts";
  const wrongDefaultModule =
    "./test/fixture-projects/load-module/constructor-args-wrong-default.ts";

  it("should throw an error when both args and path are provided", async () => {
    await assertRejectsWithHardhatError(
      resolveConstructorArgs(["foo"], validArgsModule),
      HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION
        .MUTUALLY_EXCLUSIVE_CONSTRUCTOR_ARGS,
      {},
    );
  });

  it("should return args when only args are provided", async () => {
    const constructorArgs = ["foo", "bar"];
    const resolvedConstructorArgs =
      await resolveConstructorArgs(constructorArgs);

    assert.deepEqual(resolvedConstructorArgs, constructorArgs);
  });

  it("should return empty array when neither args nor path provided", async () => {
    const resolvedConstructorArgs = await resolveConstructorArgs([]);

    assert.deepEqual(resolvedConstructorArgs, []);
  });

  it("should throw an error when module has no default export", async () => {
    await assertRejectsWithHardhatError(
      resolveConstructorArgs([], noDefaultModule),
      HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION
        .INVALID_CONSTRUCTOR_ARGS_MODULE_EXPORT,
      { constructorArgsPath: noDefaultModule },
    );
  });

  it("should throw an error when default export is not an array", async () => {
    await assertRejectsWithHardhatError(
      resolveConstructorArgs([], wrongDefaultModule),
      HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION
        .INVALID_CONSTRUCTOR_ARGS_MODULE_EXPORT,
      { constructorArgsPath: wrongDefaultModule },
    );
  });

  it("should return default export array when module exports an array", async () => {
    const resolvedConstructorArgs = await resolveConstructorArgs(
      [],
      validArgsModule,
    );

    assert.deepEqual(resolvedConstructorArgs, [1, "string arg", true]);
  });
});

describe("resolveLibraries", () => {
  const validLibsModule =
    "./test/fixture-projects/load-module/libraries-valid.ts";
  const noDefaultLibsModule =
    "./test/fixture-projects/load-module/no-default-export.ts";
  const wrongDefaultLibsModule =
    "./test/fixture-projects/load-module/libraries-wrong-default.ts";

  it("should return empty object when no path provided", async () => {
    const resolvedLibraries = await resolveLibraries();

    assert.deepEqual(resolvedLibraries, {});
  });

  it("should throw an error when module has no default export", async () => {
    await assertRejectsWithHardhatError(
      resolveLibraries(noDefaultLibsModule),
      HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION
        .INVALID_LIBRARIES_MODULE_EXPORT,
      { librariesPath: noDefaultLibsModule },
    );
  });

  it("should throw an error when default export is not an object", async () => {
    await assertRejectsWithHardhatError(
      resolveLibraries(wrongDefaultLibsModule),
      HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION
        .INVALID_LIBRARIES_MODULE_EXPORT,
      { librariesPath: wrongDefaultLibsModule },
    );
  });

  it("should return default export object when module exports an object", async () => {
    const resolvedLibraries = await resolveLibraries(validLibsModule);

    assert.deepEqual(resolvedLibraries, {
      LibX: "0x1111111111111111111111111111111111111111",
      LibY: "0x2222222222222222222222222222222222222222",
    });
  });
});
