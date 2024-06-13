import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { ParameterType } from "../../src/config.js";
import { buildGlobalParameterDefinition } from "../../src/internal/global-parameters.js";

describe("Global Parameters", () => {
  describe("buildGlobalParameterDefinition", () => {
    it("should build a global parameter definition", () => {
      const options = {
        name: "foo",
        description: "Foo description",
        parameterType: ParameterType.STRING,
        defaultValue: "bar",
      };
      const globalParameter = buildGlobalParameterDefinition(options);

      assert.deepEqual(globalParameter, options);
    });
  });
});
