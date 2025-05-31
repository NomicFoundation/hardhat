import { test } from "node:test";

test("aggregate error in top level test", async () => {
  const promise1 = Promise.reject(
    new Error("Promise 1 failed", {
      cause: new Error("Promise 1 cause", {
        cause: new AggregateError([new Error("A"), new Error("B")]),
      }),
    }),
  );
  const promise2 = Promise.reject(new Error("Promise 2 failed"));

  return Promise.any([promise1, promise2]);
});

// TODO: We're commenting out this test case because https://nodejs.org/en/blog/release/v22.16.0
// doesn't produce a circular stack trace on macOS anymore while it still does on Linux and Windows.
// test("error with circular cause in top level test", async () => {
//   const error = new Error("circular error");
//   error.cause = error;
//   throw error;
// });
