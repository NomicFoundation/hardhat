import type { GlobalOptions } from "@ignored/hardhat-vnext/types/global-options";

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
