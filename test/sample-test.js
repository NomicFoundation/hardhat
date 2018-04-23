// This test is run with sool.

describe("Tests run with sool", () => {
  let Contract;
  let contractCode;

  let ContractWithALib;
  let contractWithALibCode;

  let L;
  let lCode;

  before(async () => {
    Contract = await getContract("Contract");
    contractCode = await getContractBytecode("Contract");

    ContractWithALib = await getContract("ContractWithALib");
    contractWithALibCode = await getContractBytecode("ContractWithALib");

    L = await getContract("L");
    lCode = await getContractBytecode("L");
  });

  it("Should be deployable", async () => {
    const contract = await deploy(Contract, contractCode);
    assert.notEqual(contract._address, "0x0");
  });

  it("Should deploy contracts using libs", async () => {
    const l = await deploy(L, lCode);

    const contractWithALib = await deploy(
      ContractWithALib,
      contractWithALibCode,
      { L: l._address }
    );

    assert.notEqual(contractWithALib.address, "0x0");
  });
});
