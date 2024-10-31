import { describe, it } from "node:test";

import { assertThrows } from "../src/errors.js";
import { assertValidationErrors } from "../src/validations.js";

describe("validations", () => {
  describe("assertValidationErrors", () => {
    describe("Positive tests", () => {
      it("Should pass if the validations results are equal to the expected ones", async () => {
        assertValidationErrors([], []);

        assertValidationErrors(
          [{ path: [], message: "foo" }],
          [{ path: [], message: "foo" }],
        );

        assertValidationErrors(
          [{ path: ["a"], message: "foo" }],
          [{ path: ["a"], message: "foo" }],
        );

        assertValidationErrors(
          [{ path: ["a", 1], message: "foo" }],
          [{ path: ["a", 1], message: "foo" }],
        );

        assertValidationErrors(
          [
            { path: ["a", 1], message: "foo" },
            { path: ["b", 2], message: "bar" },
          ],
          [
            { path: ["a", 1], message: "foo" },
            { path: ["b", 2], message: "bar" },
          ],
        );
      });

      it("Should ignore the order of the errors", async () => {
        assertValidationErrors(
          [
            { path: ["a", 1], message: "foo" },
            { path: ["c", 2], message: "bar" },
          ],
          [
            { path: ["c", 2], message: "bar" },
            { path: ["a", 1], message: "foo" },
          ],
        );
      });

      it("Should support multiple errors for the same path", async () => {
        assertValidationErrors(
          [
            { path: ["a", 1], message: "foo" },
            { path: ["a", 1], message: "bar" },
          ],
          [
            { path: ["a", 1], message: "bar" },
            { path: ["a", 1], message: "foo" },
          ],
        );
      });

      it("Should allow you to omit the message", async () => {
        assertValidationErrors(
          [
            { path: ["a", 1], message: "A" },
            { path: ["a", 1], message: "B" },
          ],
          [{ path: ["a", 1] }, { path: ["a", 1], message: "B" }],
        );

        assertValidationErrors(
          [
            { path: ["a", 1], message: "A" },
            { path: ["a", 1], message: "B" },
          ],
          [{ path: ["a", 1] }, { path: ["a", 1], message: "A" }],
        );

        assertValidationErrors(
          [
            { path: ["a", 1], message: "A" },
            { path: ["b", 1], message: "B" },
          ],
          [{ path: ["b", 1] }, { path: ["a", 1], message: "A" }],
        );

        assertValidationErrors(
          [{ path: ["a", 1], message: "A" }],
          [{ path: ["a", 1] }],
        );
      });
    });

    describe("Negative tests", () => {
      it("Should throw if the a message is missing for a path", () => {
        assertThrows(() =>
          assertValidationErrors(
            [{ path: ["a", 1], message: "foo" }],
            [
              { path: ["a", 1], message: "foo" },
              { path: ["a", 1], message: "bar" },
            ],
          ),
        );
      });

      it("Should throw if the only message is incorrect", () => {
        assertThrows(() =>
          assertValidationErrors(
            [{ path: ["a", 1], message: "foo" }],
            [{ path: ["a", 1], message: "bar" }],
          ),
        );
      });

      it("Should throw if no error is present for an expected path", () => {
        assertThrows(() =>
          assertValidationErrors(
            [],
            [
              { path: ["a", 1], message: "bar" },
              { path: ["a", 1], message: "baz" },
            ],
          ),
        );
      });

      it("Should throw if there's more errors than expected for a path", () => {
        assertThrows(() =>
          assertValidationErrors(
            [
              { path: ["a", 1], message: "foo" },
              { path: ["a", 1], message: "bar" },
              { path: ["a", 1], message: "baz" },
            ],
            [
              { path: ["a", 1], message: "foo" },
              { path: ["a", 1], message: "bar" },
            ],
          ),
        );

        assertThrows(() =>
          assertValidationErrors([{ path: ["a", 1], message: "foo" }], []),
        );
      });
    });
  });
});
