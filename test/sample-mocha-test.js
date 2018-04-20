// This test is run with sool.

describe("Tests run with sool", () => {

  let Contract;
  let contractCode;

  before(async () => {
    Contract = await getContract("Contract");
    contractCode = await getContractBytecode("Contract");
  });

  it("Should be deployable", async () => {
    const contract = await deploy(Contract, contractCode);
    assert.notEqual(contract.address, "0x0")
  });

});

