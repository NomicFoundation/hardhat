const { expect, use } = require('chai');
const { waffle, ethers, artifacts } = require('hardhat');

const { BigNumber } = ethers;
const { solidity, deployContract, getSigner, link, provider } = waffle;

use(solidity);

describe('test contract linking', async () => {
  const signer = provider.getSigner();

  it('deployContract without libraries works', async () => {
    const contract = await deployContract(signer, await artifacts.readArtifact('Contract'));
    await expect(contract.inc(7)).to.emit(contract, 'Increment').withArgs(7);
  });

  it('should be able to link libraries', async () => {
    const lib = await deployContract(signer, await artifacts.readArtifact('Lib'));
    expect(lib.address).to.be.properAddress;

    // no straightforward way to use hardhat-waffle's `link` library from here
    // with deployContract or readArtifact
    // link(UsesLibArtifact, 'contract/path', lib.address);

    // this throws Error: invalid bytecode (argument="bytecode", value="0x60806...
    const contract = await deployContract(
      signer,
      await artifacts.readArtifact('UsesLib')
    );
  });
});