import { network } from "hardhat";

// address of the GasPriceOracle predeploy in OP Stack chains
const OP_GAS_PRICE_ORACLE = "0x420000000000000000000000000000000000000F";

async function mainnetExample() {
  const { ethers } = await network.connect({
    network: "hardhatMainnet",
    chainType: "l1",
  });

  const gasPriceOracleCode = await ethers.provider.getCode(OP_GAS_PRICE_ORACLE);

  console.log(
    "GasPriceOracle exists in l1 chain type?",
    gasPriceOracleCode !== "0x",
  );
}

async function opExample() {
  const { ethers } = await network.connect({
    network: "hardhatOp",
    chainType: "optimism",
  });

  const gasPriceOracleCode = await ethers.provider.getCode(OP_GAS_PRICE_ORACLE);

  console.log(
    "GasPriceOracle exists in optimism chain type?",
    gasPriceOracleCode !== "0x",
  );
}

await mainnetExample();
await opExample();
