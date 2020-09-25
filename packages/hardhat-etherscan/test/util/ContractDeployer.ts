// tslint:disable: no-implicit-dependencies
import { ethers, providers } from "ethers";

class ContractDeployer {
  private _provider: providers.BaseProvider;

  private _wallet: ethers.Wallet;

  constructor() {
    this._provider = ethers.getDefaultProvider("ropsten");
    if (
      process.env.WALLET_PRIVATE_KEY === undefined ||
      process.env.WALLET_PRIVATE_KEY === ""
    ) {
      throw new Error("missing WALLET_PRIVATE_KEY env variable");
    }
    this._wallet = new ethers.Wallet(
      process.env.WALLET_PRIVATE_KEY,
      this._provider
    );
  }

  public async deployContract(
    abi: any[],
    bytecode: string,
    ...constructorArguments: string[]
  ): Promise<string> {
    const factory = new ethers.ContractFactory(abi, bytecode, this._wallet);
    const contract = await factory.deploy(...constructorArguments);
    await contract.deployed();
    await contract.deployTransaction.wait(3);
    return contract.address;
  }
}

export default ContractDeployer;
