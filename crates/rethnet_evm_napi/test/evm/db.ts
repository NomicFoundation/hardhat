import { expect } from 'chai';
import { DefaultStateManager } from '@nomicfoundation/ethereumjs-statemanager'
import { AccountData, Address } from '@nomicfoundation/ethereumjs-util'

import { RethnetClient, Account, Transaction } from '../../rethnet-evm'

describe('HardhatDB', () => {
    it('getAccountByAddress', async () => {
        let rethnet = new RethnetClient();

        const createContractCaller = Address.fromString("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
        const createContract: Transaction = {
            from: createContractCaller.buf,
            input: Buffer.from("6080604052600160005534801561001557600080fd5b50610164806100256000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80630c55699c1461003b578063371303c014610059575b600080fd5b610043610063565b604051610050919061009b565b60405180910390f35b610061610069565b005b60005481565b60008081548092919061007b906100e5565b9190505550565b6000819050919050565b61009581610082565b82525050565b60006020820190506100b0600083018461008c565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60006100f082610082565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff821415610123576101226100b6565b5b60018201905091905056fea26469706673582212202cd84f1b59f638e2c2982fcda9b4ec361fb39f3bb8919c156e8500f9844c1dc164736f6c63430008090033"),
        };

        let createContractChanges = await rethnet.call(createContract);
        console.log(createContractChanges);

        const runContractCaller = Address.fromString("0x5FbDB2315678afecb367f032d93F642f64180aa3");
        const runContract: Transaction = {
            from: createContractCaller.buf,
            input: Buffer.from("0c55699c"),
        };

        let runContractChanges = await rethnet.call(runContract);
        console.log(runContractChanges);


        // const account = await rethnet.getAccountByAddress(dummy_address.buf);
        // expect(account.balance.toString()).to.equals("0");
        // expect(account.nonce.toString()).to.equals("0");
        // expect(account.codeHash.byteLength).to.equals(32);
        // console.log(account.codeHash);

        // let dummy_nonce = BigInt(500);
        // let dummy_balance = BigInt(9999);
        // let dummy_account = new Account(dummy_nonce, dummy_balance);
        // console.log(dummy_account);

        // let dummy_address = Address.zero();
        // stateManager.putAccount(dummy_address, dummy_account);

        // console.log(dummy_account);

        // let db = new HardhatDB(stateManager);
        // let rethnet = new Rethnet(db);

        // let account: Account = rethnet.get_account_by_address(dummy_address);

        // console.log(account);
        // expect(account.nonce).to.equal(dummy_nonce);
    });
});
