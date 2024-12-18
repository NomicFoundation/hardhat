// eslint-disable-next-line import/no-extraneous-dependencies -- allow in fixture projects
import { AssertionError, expect } from "chai";

describe("chai-matcher-test", () => {
  it("should pass", () => {
    expect("0x0000010AB").to.not.hexEqual("0x0010abc");

    expect(
      () =>
        expect("0x28FAA621c3348823D6c6548981a19716bcDc740").to.be.properAddress,
    ).to.throw(
      AssertionError,
      'Expected "0x28FAA621c3348823D6c6548981a19716bcDc740" to be a proper address',
    );
  });
});
