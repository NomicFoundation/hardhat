import { network } from "hardhat";

// address of the GasPriceOracle predeploy in OP Stack chains
const OP_GAS_PRICE_ORACLE = "0x420000000000000000000000000000000000000F";

async function mainnetExample() {
  const { viem } = await network.connect("hardhatMainnet", "l1");

  const publicClient = await viem.getPublicClient();
  const gasPriceOracleCode = await publicClient.getCode({
    address: OP_GAS_PRICE_ORACLE,
  });

  console.log(
    "GasPriceOracle exists in l1 chain type?",
    gasPriceOracleCode !== undefined,
  );
}

async function opExample() {
  const { viem } = await network.connect("hardhatOp", "optimism");

  const publicClient = await viem.getPublicClient();
  const gasPriceOracleCode = await publicClient.getCode({
    address: OP_GAS_PRICE_ORACLE,
  });

  console.log(
    "GasPriceOracle exists in optimism chain type?",
    gasPriceOracleCode !== undefined,
  );
}

await mainnetExample();
await opExample();
