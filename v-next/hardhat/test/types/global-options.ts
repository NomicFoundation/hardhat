import type { GlobalOptions } from "../../src/types/global-options.js";

import { describe, it } from "node:test";

import { expectTypeOf } from "expect-type";

describe("types/global-options", () => {
  describe("GlobalOptions", () => {
    it("should be augmented with the builtin global options", () => {
      expectTypeOf<GlobalOptions>().toEqualTypeOf<{
        config: string;
        help: boolean;
        init: boolean;
        showStackTraces: boolean;
        version: boolean;
      }>();
    });
  });
});
