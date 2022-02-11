import { assert } from "chai";

import { chunkedPromiseAll } from "../../../src/internal/util/chunked-promise-all";

describe("chunked promise all", () => {
  let promises: Array<() => Promise<unknown>>;
  let expected: Array<number | Error>;

  beforeEach(function () {
    promises = [
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(1);
          }, 4000);
        }),
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(2);
          }, 1000);
        }),
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(3);
          }, 2000);
        }),
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(4);
          }, 3000);
        }),
    ];

    expected = [1, 2, 3, 4];
  });

  describe("basic functionality", () => {
    it("should return an array of results from the given promises", async () => {
      const results = await chunkedPromiseAll(promises);
      assert.includeMembers(results, expected);
    });

    it("should return an array of results when the number of promises given exceeds chunkSize", async () => {
      const results = await chunkedPromiseAll(promises, 2);
      assert.includeMembers(results, expected);
    });
  });

  describe("error handling", () => {
    beforeEach(function () {
      const e = new Error("test");

      promises.splice(0, 1, () => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(e);
          }, 4000);
        });
      });
      expected.splice(0, 1, e);
    });

    it("should include an error in the results array", async () => {
      const results = await chunkedPromiseAll(promises);
      assert.includeMembers(results, expected);
    });

    it("should include an error in the results array when the number of promises given exceeds chunkSize", async () => {
      const results = await chunkedPromiseAll(promises, 2);
      assert.includeMembers(results, expected);
    });
  });
});
