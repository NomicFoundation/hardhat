import { assert } from "chai";
import { BN } from "ethereumjs-util";

import { weiToHumanReadableString } from "../../../src/internal/util/wei-values";

describe("Wei values formatting", function () {
  const ONE_GWEI = new BN(10).pow(new BN(9));
  const ONE_ETH = new BN(10).pow(new BN(18));

  it("Should show 0 wei as 0 ETH", function () {
    assert.equal(weiToHumanReadableString(0), "0 ETH");
  });

  it("Should show 1 wei as wei", function () {
    assert.equal(weiToHumanReadableString(1), "1 wei");
  });

  it("Should show 10 wei as wei", function () {
    assert.equal(weiToHumanReadableString(10), "10 wei");
  });

  it("Should show 10000 wei as wei", function () {
    assert.equal(weiToHumanReadableString(10000), "10000 wei");
  });

  it("Should show 100000 wei as gwei", function () {
    assert.equal(weiToHumanReadableString(100000), "0.0001 gwei");
  });

  it("Should show 0.0001 gwei as gwei", function () {
    assert.equal(weiToHumanReadableString(ONE_GWEI.divn(10000)), "0.0001 gwei");
  });

  it("Should show 0.1 gwei as gwei", function () {
    assert.equal(weiToHumanReadableString(ONE_GWEI.divn(10)), "0.1 gwei");
  });

  it("Should show 1 gwei as gwei", function () {
    assert.equal(weiToHumanReadableString(ONE_GWEI), "1 gwei");
  });

  it("Should show 10 gwei as gwei", function () {
    assert.equal(weiToHumanReadableString(ONE_GWEI.muln(10)), "10 gwei");
  });

  it("Should show 10 gwei as gwei", function () {
    assert.equal(weiToHumanReadableString(ONE_GWEI.muln(10)), "10 gwei");
  });

  it("Should show 10000 gwei as gwei", function () {
    assert.equal(weiToHumanReadableString(ONE_GWEI.muln(10000)), "10000 gwei");
  });

  it("Should show 100000 gwei as ETH", function () {
    assert.equal(weiToHumanReadableString(ONE_GWEI.muln(100000)), "0.0001 ETH");
  });

  it("Should show 0.0001 ETH as ETH", function () {
    assert.equal(weiToHumanReadableString(ONE_ETH.divn(10000)), "0.0001 ETH");
  });

  it("Should show 0.1 ETH as ETH", function () {
    assert.equal(weiToHumanReadableString(ONE_ETH.divn(10)), "0.1 ETH");
  });

  it("Should show 1 ETH as ETH", function () {
    assert.equal(weiToHumanReadableString(ONE_ETH), "1 ETH");
  });

  it("Should show 1.2 ETH as ETH", function () {
    assert.equal(
      weiToHumanReadableString(ONE_ETH.add(ONE_ETH.divn(10).muln(2))),
      "1.2 ETH"
    );
  });

  it("Should show 43 ETH as ETH", function () {
    assert.equal(weiToHumanReadableString(ONE_ETH.muln(43)), "43 ETH");
  });
});
