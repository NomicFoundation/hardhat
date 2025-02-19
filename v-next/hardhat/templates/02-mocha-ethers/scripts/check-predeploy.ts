import { network } from "@ignored/hardhat-vnext";

// address of the GasPriceOracle deploy in OP Stack chains
const OP_GAS_PRICE_ORACLE = "0x420000000000000000000000000000000000000F";

async function mainnetExample() {
  const { ethers } = await network.connect("hardhatMainnet", "l1");

  const gasPriceOracleCode = await ethers.provider.getCode(OP_GAS_PRICE_ORACLE);

  console.log(
    "GasPriceOracle exists in mainnet chain type?",
    gasPriceOracleCode !== "0x",
  );
}

async function opExample() {
  const { ethers } = await network.connect("hardhatOp", "optimism");

  const gasPriceOracleCode = await ethers.provider.getCode(OP_GAS_PRICE_ORACLE);

  console.log(
    "GasPriceOracle exists in op chain type?",
    gasPriceOracleCode !== "0x",
  );
}

await mainnetExample();
await opExample();
