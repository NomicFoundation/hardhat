import { describe, it } from "node:test";

import { expect, AssertionError } from "chai";

import { addChaiMatchers } from "../../src/internal/add-chai-matchers.js";

/* eslint-disable @typescript-eslint/no-unused-expressions -- allow all the expressions */

addChaiMatchers();

describe("Proper private key", () => {
  it("Expect to be proper private key", async () => {
    expect("0x706618637b8ca922f6290ce1ecd4c31247e9ab75cf0530a0ac95c0332173d7c5")
      .to.be.properPrivateKey;
    expect("0x03c909455dcef4e1e981a21ffb14c1c51214906ce19e8e7541921b758221b5ae")
      .to.be.properPrivateKey;
  });

  it("Expect not to be proper private key", async () => {
    expect("0x28FAA621c3348823D6c6548981a19716bcDc740").to.not.be
      .properPrivateKey;
    expect("0x706618637b8ca922f6290ce1ecd4c31247e9ab75cf0530a0ac95c0332173d7cw")
      .to.not.be.properPrivateKey;
    expect("0x03c909455dcef4e1e981a21ffb14c1c51214906ce19e8e7541921b758221b5-e")
      .to.not.be.properPrivateKey;
  });

  it("Expect to throw if invalid private key", async () => {
    expect(
      () =>
        expect(
          "0x706618637b8ca922f6290ce1ecd4c31247e9ab75cf0530a0ac95c0332173d7c",
        ).to.be.properPrivateKey,
    ).to.throw(
      AssertionError,
      'Expected "0x706618637b8ca922f6290ce1ecd4c31247e9ab75cf0530a0ac95c0332173d7c" to be a proper private key',
    );
  });

  it("Expect to throw if negation with proper private key)", async () => {
    expect(
      () =>
        expect(
          "0x706618637b8ca922f6290ce1ecd4c31247e9ab75cf0530a0ac95c0332173d7c5",
        ).not.to.be.properPrivateKey,
    ).to.throw(
      AssertionError,
      'Expected "0x706618637b8ca922f6290ce1ecd4c31247e9ab75cf0530a0ac95c0332173d7c5" NOT to be a proper private key',
    );
  });
});
