import { describe, it } from "node:test";

import { network } from "hardhat";

describe("Counter", async function () {
  const { viem } = await network.connect();

  it("Should track the proxied calls to Impl1 and Impl2 as separate, despite using the same proxy", async function () {
    const impl1 = await viem.deployContract("Impl1");
    const impl2 = await viem.deployContract("Impl2");

    const proxy1 = await viem.deployContract("Proxy", [impl1.address]);
    const proxy2 = await viem.deployContract("Proxy", [impl2.address]);

    const i1 = await viem.getContractAt("Impl1", proxy1.address);
    const i2 = await viem.getContractAt("Impl2", proxy2.address);

    console.log("Calling Proxy -> Impl1");
    await i1.write.one();

    console.log("Calling Proxy -> Impl2");
    await i2.write.two();

    console.log("Calling Impl1");
    await impl1.write.one();
  });

  it("Should track the proxied calls to Impl1 as separate if they use separate proxy chains", async function () {
    // We use the same impl but different proxy chains
    const impl1 = await viem.deployContract("Impl1");

    const proxy1 = await viem.deployContract("Proxy", [impl1.address]);
    const proxy2 = await viem.deployContract("Proxy", [impl1.address]);

    // We use a proxy in front of Proxy1
    const proxy11 = await viem.deployContract("Proxy2", [
      impl1.address,
      proxy1.address,
    ]);

    const i1 = await viem.getContractAt("Impl1", proxy11.address);
    const i2 = await viem.getContractAt("Impl1", proxy2.address);

    console.log("Calling Proxy2 -> Proxy -> Impl1");
    await i1.write.one();
    console.log("Calling Proxy1 -> Impl1");
    await i2.write.one();
  });
});
