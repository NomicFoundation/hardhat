// This test is run with buidler.

const Contract = artifacts.require("Contract");
const L = artifacts.require("L");
const ContractWithALib = artifacts.require("ContractWithALib");

contract("Tests run with buidler", accounts => {
  it("Should be deployable", async () => {
    const contract = await Contract.new();
    assert.notEqual(contract.address, "0x0");
  });

  it("Should deploy contracts using libs", async () => {
    // const l = await deploy(L, lCode);
    //
    // const contractWithALib = await deploy(
    //   ContractWithALib,
    //   contractWithALibCode,
    //   { L: l.address }
    // );
    //
    // assert.notEqual(contractWithALib.address, "0x0");
  });
});
