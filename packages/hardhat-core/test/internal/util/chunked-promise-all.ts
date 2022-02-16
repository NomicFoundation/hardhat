import { assert } from "chai";
import sinon from "sinon";

import { chunkedPromiseAll } from "../../../src/internal/util/chunked-promise-all";

describe.only("chunked promise all", () => {
  let promises: Array<() => Promise<unknown>>;
  let expected: Array<number | Error>;

  beforeEach(function () {
    promises = [
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(1);
          }, 400);
        }),
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(2);
          }, 100);
        }),
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(3);
          }, 200);
        }),
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(4);
          }, 300);
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
    it("should throw if an error is thrown within a function", async () => {
      const e = new Error("test");

      promises.splice(0, 1, () => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(e);
          }, 400);
        });
      });

      await assert.isRejected(chunkedPromiseAll(promises));
    });
  });

  describe("each function is only called once", function () {
    it("1 promise, chunk size of 4", async function () {
      const p1 = sinon.spy(() => Promise.resolve(1));

      const results = await chunkedPromiseAll([p1], 4);

      assert.includeMembers(results, [1]);

      assert.isTrue(p1.calledOnce);
    });

    it("2 promises, chunk size of 4", async function () {
      const p1 = sinon.spy(() => Promise.resolve(1));
      const p2 = sinon.spy(() => Promise.resolve(2));

      const results = await chunkedPromiseAll([p1, p2], 4);

      assert.includeMembers(results, [1, 2]);

      assert.isTrue(p1.calledOnce);
      assert.isTrue(p2.calledOnce);
    });

    it("4 promises, chunk size of 4", async function () {
      const ps = [1, 2, 3, 4].map((x) => sinon.spy(() => Promise.resolve(x)));

      const results = await chunkedPromiseAll(ps, 4);

      assert.includeMembers(results, [1, 2, 3, 4]);

      for (const p of ps) {
        assert.isTrue(p.calledOnce);
      }
    });

    it("5 promises, chunk size of 4", async function () {
      const ps = [1, 2, 3, 4, 5].map((x) =>
        sinon.spy(() => Promise.resolve(x))
      );

      const results = await chunkedPromiseAll(ps, 4);

      assert.includeMembers(results, [1, 2, 3, 4, 5]);

      for (const p of ps) {
        assert.isTrue(p.calledOnce);
      }
    });

    it("8 promises, chunk size of 4", async function () {
      const ps = [1, 2, 3, 4, 5, 6, 7, 8].map((x) =>
        sinon.spy(() => Promise.resolve(x))
      );

      const results = await chunkedPromiseAll(ps, 4);

      assert.includeMembers(results, [1, 2, 3, 4, 5, 6, 7, 8]);

      for (const p of ps) {
        assert.isTrue(p.calledOnce);
      }
    });
  });
});
