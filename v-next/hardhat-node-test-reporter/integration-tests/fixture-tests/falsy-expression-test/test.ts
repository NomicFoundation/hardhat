/* eslint-disable -- This test is sensitive to the formatting of the input */

import assert from "node:assert";
import { describe, it } from "node:test";

const STRING = " ";

const _f = async (_: string) => {};

describe("a", () => {
    it("b", async () => {
        assert("".includes(STRING));

        console.log("SomethingSomethingSomething");
    });
});
