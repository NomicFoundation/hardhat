import {ethers} from 'ethers'
import providers from 'ethers/providers'

class ContractDeployer {

    private provider: providers.BaseProvider;

    private wallet: ethers.Wallet;

    constructor() {
        this.provider = ethers.getDefaultProvider('ropsten');
        if(!process.env.WALLET_PRIVATE_KEY) throw new Error('missing WALLET_PRIVATE_KEY env variable');
        this.wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, this.provider);
    }

    async deployContract(abi: Array<any>, bytecode: string, ...constructorArguments: string[]): Promise<string> {
        const factory = new ethers.ContractFactory(abi, bytecode, this.wallet);
        const contract = await factory.deploy(...constructorArguments);
        await contract.deployed();
        await contract.deployTransaction.wait(3);
        return contract.address;
    }

}

export default new ContractDeployer();
