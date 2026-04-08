import test from "node:test";

test("foo", () => {
  setTimeout(() => {
    throw new Error();
  }, 100);
});
