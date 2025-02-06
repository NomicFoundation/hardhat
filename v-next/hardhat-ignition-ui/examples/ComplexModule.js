import { buildModule } from "@ignored/hardhat-vnext-ignition-core";

const fakeArtifact = ["fake artifact"];

const fakeModuleDependency = buildModule("FakeModule", (m) => {
  const contract = m.contract("FakeContract", [1, 2, 3]);

  m.call(contract, "initialize", [4, 5, 6]);

  return {};
});

const uniswap = buildModule("Uniswap", (m) => {
  const router = m.contract("UniswapRouter", [1, 2, 3], {
    after: [fakeModuleDependency],
  });

  m.call(router, "configure", [3, 4, 5]);

  return { router };
});

const balancerDefinition = buildModule("Balancer", (m) => {
  const safeMath = m.library("SafeMath");

  const balancer = m.contract("BalancerCore", [], {
    libraries: {
      SafeMath: safeMath,
    },
  });

  const { router } = m.useModule(uniswap);

  const setUniswapData = m.encodeFunctionCall(balancer, "setUniswap", [router]);
  m.send("sendSetUniswapCall", balancer, 0n, setUniswapData);

  return { balancer };
});

const synthetixDefinition = buildModule("Synthetix", (m) => {
  const synthetixCore = m.contractAt(
    "SynthetixCore",
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    fakeArtifact,
  );

  const { router } = m.useModule(uniswap);

  m.call(synthetixCore, "setUniswap(boolean,address)", [false, router]);

  return { synthetix: synthetixCore };
});

const moduleDefinition = buildModule("MyModule", (m) => {
  const { synthetix } = m.useModule(synthetixDefinition);
  const { balancer } = m.useModule(balancerDefinition);

  const testHelper = m.contract("TestHelper");
  const alsoTestHelper = m.contract("TestHelper", [], { id: "alsoTestHelper" });
  const myDefi = m.contract("MyDefi", [], { after: [synthetix, balancer] });

  const { router } = m.useModule(uniswap);

  return { myDefi, router, synthetix, balancer, testHelper, alsoTestHelper };
});

export default moduleDefinition;
