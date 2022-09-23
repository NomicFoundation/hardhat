/* eslint-disable import/no-unused-modules */
import type { IgnitionPlan } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import fs from "fs-extra";
import path from "path";
import sinon from "sinon";

import { Renderer } from "../../src/plan";
import { useEnvironment } from "../useEnvironment";

describe("Renderer", () => {
  useEnvironment("minimal");

  it("should ensure the directory structure exists", () => {
    const fake = sinon.fake();

    sinon.replace(fs, "ensureDirSync", fake);

    new Renderer({} as IgnitionPlan, { cachePath: "test/path" });

    console.log("fake.getCalls()[0].args[0]");
    console.log(fake.getCalls()[0].args[0]);
    assert(fake.callCount === 2);
    sinon.assert.calledWithMatch(
      fake.getCalls()[0],
      path.resolve("/test/path/plan/recipe")
    );
    sinon.assert.calledWithMatch(
      fake.getCalls()[1],
      path.resolve("/test/path/plan/execution")
    );
  });

  it("should return the proper paths", () => {
    const renderer = new Renderer({} as IgnitionPlan, {
      cachePath: "test/path",
    });

    console.log("renderer.planPath");
    console.log(renderer.planPath);
    console.log("renderer.recipePath");
    console.log(renderer.recipePath);
    assert(renderer.planPath.endsWith(path.resolve("/test/path/plan")));
    assert(
      renderer.recipePath.endsWith(path.resolve("/test/path/plan/recipe"))
    );
    assert(
      renderer.executionPath.endsWith(path.resolve("/test/path/plan/execution"))
    );
  });
});
