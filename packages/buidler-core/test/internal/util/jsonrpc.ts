import { assert } from "chai";

import { isValidJsonResponse } from "../../../src/internal/util/jsonrpc";

describe("JSON-RPC", function () {
  describe("JSON-RPC response validation", function () {
    describe("Invalid responses", function () {
      it("Should validate the jsonrpc field", function () {
        assert.isFalse(
          isValidJsonResponse({
            jsonrpc: "2.0.0",
            id: 123,
            result: "asd",
          })
        );

        assert.isFalse(
          isValidJsonResponse({
            jsonrpc: 123,
            id: 123,
            result: "asd",
          })
        );

        assert.isFalse(
          isValidJsonResponse({
            id: 123,
            result: "asd",
          })
        );
      });

      it("Should validate the id field", function () {
        // Response without the id field is still a valid response,
        // returned when an invalid JSON was provided as the request
        // and id could not be parsed from it.
        assert.isFalse(
          isValidJsonResponse({
            jsonrpc: "2.0",
            result: "asd",
          })
        );

        assert.isTrue(
          isValidJsonResponse({
            jsonrpc: "2.0",
            id: null,
            error: {
              code: 123,
              message: "asd",
            },
          })
        );

        assert.isFalse(
          isValidJsonResponse({
            jsonrpc: "2.0",
            id: null,
            result: 123,
          })
        );

        assert.isFalse(
          isValidJsonResponse({
            jsonrpc: "2.0",
            id: [],
            result: "asd",
          })
        );

        assert.isFalse(
          isValidJsonResponse({
            jsonrpc: "2.0",
            id: {},
            result: "asd",
          })
        );
      });

      it("Should validate that only response or error are present", function () {
        assert.isTrue(
          isValidJsonResponse({
            jsonrpc: "2.0",
            id: "123",
            result: "asd",
            error: {
              code: 123,
              message: "asd",
            },
          })
        );
      });
    });

    describe("Valid responses", function () {
      it("Should be true for valid successful responses", function () {
        assert.isTrue(
          isValidJsonResponse({
            jsonrpc: "2.0",
            id: 123,
            result: "asd",
          })
        );

        assert.isTrue(
          isValidJsonResponse({
            jsonrpc: "2.0",
            id: "123",
            result: "asd",
          })
        );

        assert.isTrue(
          isValidJsonResponse({
            jsonrpc: "2.0",
            id: 123,
            result: { asd: 123 },
          })
        );

        assert.isTrue(
          isValidJsonResponse({
            jsonrpc: "2.0",
            id: 123,
            result: 123,
          })
        );

        assert.isTrue(
          isValidJsonResponse({
            jsonrpc: "2.0",
            id: 123,
            result: [123],
          })
        );
      });

      it("Should be true for valid failure responses with data", function () {
        assert.isTrue(
          isValidJsonResponse({
            jsonrpc: "2.0",
            id: 123,
            error: {
              code: 2,
              message: "err",
            },
          })
        );
      });

      it("Should be true for valid failure responses without data", function () {
        assert.isTrue(
          isValidJsonResponse({
            jsonrpc: "2.0",
            id: 123,
            error: {
              code: 2,
              message: "err",
              data: 123,
            },
          })
        );

        assert.isTrue(
          isValidJsonResponse({
            jsonrpc: "2.0",
            id: 123,
            error: {
              code: 2,
              message: "err",
              data: ["asd"],
            },
          })
        );

        assert.isTrue(
          isValidJsonResponse({
            jsonrpc: "2.0",
            id: 123,
            error: {
              code: 2,
              message: "err",
              data: { a: 1 },
            },
          })
        );
      });
    });
  });
});
