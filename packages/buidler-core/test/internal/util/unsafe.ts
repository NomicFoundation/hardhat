import { assert } from "chai";

import { unsafeObjectKeys } from "../../../src/internal/util/unsafe";

describe("Type unsafe helpers functions", () => {
  describe("unsafeObjectKeys", () => {
    it("Should return the right type", () => {
      interface T {
        a: string;
        b: number;
      }

      type KeysType = "a" | "b";

      const t: T = { a: "a", b: 123 };

      const keys: KeysType[] = unsafeObjectKeys(t);
      assert.deepEqual([...new Set(keys)], [...new Set(["a", "b"])]);
    });

    it("Should work with extended types, but that's unsafe", () => {
      interface T {
        a: string;
        b: number;
      }

      interface T2 {
        a: string;
        b: number;
        c: boolean;
      }

      type KeysType = "a" | "b";

      const t2: T2 = { a: "a", b: 123, c: false };
      const t: T = t2;

      const keys: KeysType[] = unsafeObjectKeys(t);

      // This is the unsafe case, where we receive a key not in KeyType because
      // we passed an extension of T.
      assert.notDeepEqual([...new Set(keys)], [...new Set(["a", "b"])]);
    });
  });
});
