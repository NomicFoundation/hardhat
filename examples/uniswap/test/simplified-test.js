const { assert } = require("chai");
const UniswapModule = require("../ignition/modules/Uniswap");

describe("uniswap deploy", () => {
  let nonfungibleTokenPositionManager, uniswapV3Factory, swapRouter02;

  beforeEach(async () => {
    const [sign1, sign2] = await hre.ethers.getSigners();
    owner = sign1;
    user1 = sign2;

    // Deploy Uniswap
    ({ nonfungibleTokenPositionManager, uniswapV3Factory, swapRouter02 } =
      await ignition.deploy(UniswapModule));
  });

  it("should deploy uniswap", async () => {
    assert.equal(
      await nonfungibleTokenPositionManager.getAddress(),
      "0xb7f8bc63bbcad18155201308c8f3540b07f84f5e"
    );
    assert.equal(
      await uniswapV3Factory.getAddress(),
      "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9"
    );
    assert.equal(
      await swapRouter02.getAddress(),
      "0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0"
    );
  });
});
