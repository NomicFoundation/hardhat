import { assert } from "chai";

import { weiToHumanReadableString } from "../../../src/internal/util/wei-values";

describe("Wei values formatting", function () {
  const ONE_GWEI = 10n ** 9n;
  const ONE_ETH = 10n ** 18n;

  it("Should show 0 wei as 0 ETH", function () {
    assert.strictEqual(weiToHumanReadableString(0), "0 ETH");
  });

  it("Should show 1 wei as wei", function () {
    assert.strictEqual(weiToHumanReadableString(1), "1 wei");
  });

  it("Should show 10 wei as wei", function () {
    assert.strictEqual(weiToHumanReadableString(10), "10 wei");
  });

  it("Should show 10000 wei as wei", function () {
    assert.strictEqual(weiToHumanReadableString(10000), "10000 wei");
  });

  it("Should show 100000 wei as gwei", function () {
    assert.strictEqual(weiToHumanReadableString(100000), "0.0001 gwei");
  });

  it("Should show 0.0001 gwei as gwei", function () {
    assert.strictEqual(weiToHumanReadableString(ONE_GWEI / 10000n), "0.0001 gwei");
  });

  it("Should show 0.1 gwei as gwei", function () {
    assert.strictEqual(weiToHumanReadableString(ONE_GWEI / 10n), "0.1 gwei");
  });

  it("Should show 1 gwei as gwei", function () {
    assert.strictEqual(weiToHumanReadableString(ONE_GWEI), "1 gwei");
  });

  it("Should show 10 gwei as gwei", function () {
    assert.strictEqual(weiToHumanReadableString(10n * ONE_GWEI), "10 gwei");
  });

  it("Should show 10 gwei as gwei", function () {
    assert.strictEqual(weiToHumanReadableString(10n * ONE_GWEI), "10 gwei");
  });

  it("Should show 10000 gwei as gwei", function () {
    assert.strictEqual(weiToHumanReadableString(10_000n * ONE_GWEI), "10000 gwei");
  });

  it("Should show 100000 gwei as ETH", function () {
    assert.strictEqual(weiToHumanReadableString(100_000n * ONE_GWEI), "0.0001 ETH");
  });

  it("Should show 0.0001 ETH as ETH", function () {
    assert.strictEqual(weiToHumanReadableString(ONE_ETH / 10000n), "0.0001 ETH");
  });

  it("Should show 0.1 ETH as ETH", function () {
    assert.strictEqual(weiToHumanReadableString(ONE_ETH / 10n), "0.1 ETH");
  });

  it("Should show 1 ETH as ETH", function () {
    assert.strictEqual(weiToHumanReadableString(ONE_ETH), "1 ETH");
  });

  it("Should show 1.2 ETH as ETH", function () {
    assert.strictEqual(
      weiToHumanReadableString(ONE_ETH + (2n * ONE_ETH) / 10n),
      "1.2 ETH"
    );
  });

  it("Should show 43 ETH as ETH", function () {
    assert.strictEqual(weiToHumanReadableString(43n * ONE_ETH), "43 ETH");
  });
});
