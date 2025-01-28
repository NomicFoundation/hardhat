import { expect, AssertionError } from "chai";

import "../src/internal/add-chai-matchers";

/* eslint-disable @typescript-eslint/no-unused-expressions */

describe("Proper address", () => {
  it("Expect to be proper address", async () => {
    expect("0x28FAA621c3348823D6c6548981a19716bcDc740e").to.be.properAddress;
    expect("0x846C66cf71C43f80403B51fE3906B3599D63336f").to.be.properAddress;
  });

  it("Expect not to be proper address", async () => {
    expect("28FAA621c3348823D6c6548981a19716bcDc740e").not.to.be.properAddress;
    expect("0x28FAA621c3348823D6c6548981a19716bcDc740").to.not.be.properAddress;
    expect("0x846C66cf71C43f80403B51fE3906B3599D63336g").to.not.be
      .properAddress;
    expect("0x846C66cf71C43f80403B51fE3906B3599D6333-f").to.not.be
      .properAddress;
  });

  it("Expect to throw if invalid address", async () => {
    expect(
      () =>
        expect("0x28FAA621c3348823D6c6548981a19716bcDc740").to.be.properAddress
    ).to.throw(
      AssertionError,
      'Expected "0x28FAA621c3348823D6c6548981a19716bcDc740" to be a proper address'
    );
  });

  it("Expect to throw if negation with proper address", async () => {
    expect(
      () =>
        expect("0x28FAA621c3348823D6c6548981a19716bcDc740e").not.to.be
          .properAddress
    ).to.throw(
      AssertionError,
      'Expected "0x28FAA621c3348823D6c6548981a19716bcDc740e" NOT to be a proper address'
    );
  });
});
