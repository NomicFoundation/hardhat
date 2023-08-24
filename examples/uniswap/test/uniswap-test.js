const { assert } = require("chai");
const { Token } = require("@uniswap/sdk-core");
const { Pool, Position, nearestUsableTick } = require("@uniswap/v3-sdk");
const UniswapV3Pool = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json");
const UniswapModule = require("../ignition/Uniswap");
const {
  encodePriceSqrt,
  getPoolImmutables,
  getPoolState,
} = require("./helpers");

describe.skip("Uniswap", function () {
  const fee = 500;
  let owner, user1, solidus, florin;
  let nonfungibleTokenPositionManager, uniswapV3Factory, swapRouter02;
  let pool;

  before(async () => {
    const [sign1, sign2] = await hre.ethers.getSigners();
    owner = sign1;
    user1 = sign2;

    // Deploy Uniswap
    ({ nonfungibleTokenPositionManager, uniswapV3Factory, swapRouter02 } =
      await ignition.deploy(UniswapModule, {
        config: { requiredConfirmations: 1 },
      }));

    // Deploy example tokens Solidus and Florin
    const Solidus = await hre.ethers.getContractFactory("Solidus");
    solidus = await Solidus.deploy();

    const Florin = await hre.ethers.getContractFactory("Florin");
    florin = await Florin.deploy();

    // Create pool for solidus/florin
    await nonfungibleTokenPositionManager.createAndInitializePoolIfNecessary(
      solidus.address,
      florin.address,
      fee,
      encodePriceSqrt(1, 1),
      { gasLimit: 5000000 }
    );

    const poolAddress = await uniswapV3Factory.getPool(
      solidus.address,
      florin.address,
      fee
    );

    pool = await hre.ethers.getContractAtFromArtifact(
      UniswapV3Pool,
      poolAddress
    );

    // Add liquidity to pool
    await solidus.mint(owner.address, hre.ethers.utils.parseUnits("1000", 18));
    await solidus
      .connect(owner)
      .approve(
        nonfungibleTokenPositionManager.address,
        hre.ethers.utils.parseUnits("1000", 18)
      );

    await florin.mint(owner.address, hre.ethers.utils.parseUnits("1000", 18));
    await florin
      .connect(owner)
      .approve(
        nonfungibleTokenPositionManager.address,
        hre.ethers.utils.parseUnits("1000", 18)
      );

    const [poolImmutables, poolState] = await Promise.all([
      getPoolImmutables(pool),
      getPoolState(pool),
    ]);

    const SolidusToken = new Token(
      31337,
      poolImmutables.token0,
      18,
      "SO",
      "Solidus"
    );

    const FlorinToken = new Token(
      31337,
      poolImmutables.token1,
      18,
      "FN",
      "Florin"
    );

    const poolFromSdk = new Pool(
      SolidusToken,
      FlorinToken,
      poolImmutables.fee,
      poolState.sqrtPriceX96.toString(),
      poolState.liquidity.toString(),
      poolState.tick
    );

    const position = new Position({
      pool: poolFromSdk,
      liquidity: hre.ethers.utils.parseUnits("1", 18),
      tickLower:
        nearestUsableTick(poolState.tick, poolImmutables.tickSpacing) -
        poolImmutables.tickSpacing * 2,
      tickUpper:
        nearestUsableTick(poolState.tick, poolImmutables.tickSpacing) +
        poolImmutables.tickSpacing * 2,
    });

    const { amount0: amount0Desired, amount1: amount1Desired } =
      position.mintAmounts;

    await nonfungibleTokenPositionManager.connect(owner).mint(
      {
        token0: solidus.address,
        token1: florin.address,
        fee: fee,
        tickLower:
          nearestUsableTick(poolState.tick, poolImmutables.tickSpacing) -
          poolImmutables.tickSpacing * 2,
        tickUpper:
          nearestUsableTick(poolState.tick, poolImmutables.tickSpacing) +
          poolImmutables.tickSpacing * 2,
        amount0Desired: amount0Desired.toString(),
        amount1Desired: amount1Desired.toString(),
        amount0Min: 0,
        amount1Min: 0,
        recipient: owner.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 10,
      },
      { gasLimit: "1000000" }
    );
  });

  it("should allow swapping from florin token to solidus token", async function () {
    // arrange
    const amountToSwap = 100;

    // add that amount to the users florin's balance
    await florin.mint(user1.address, 100);
    await florin.connect(user1).approve(swapRouter02.address, 100);

    assert.equal(await florin.balanceOf(user1.address), 100);
    assert.equal(await solidus.balanceOf(user1.address), 0);

    // act
    await swapRouter02.connect(user1).exactInputSingle({
      tokenIn: florin.address,
      tokenOut: solidus.address,
      fee,
      recipient: user1.address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 10,
      amountIn: amountToSwap,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });

    // assert
    assert.equal(await florin.balanceOf(user1.address), 0);
    assert.equal(await solidus.balanceOf(user1.address), 98);
  });
});
