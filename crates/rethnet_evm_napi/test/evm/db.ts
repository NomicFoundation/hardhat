import { expect } from 'chai';
import { DefaultStateManager } from '@nomicfoundation/ethereumjs-statemanager'
import { AccountData, Address } from '@nomicfoundation/ethereumjs-util'

import { RethnetClient, Account, Transaction } from '../../rethnet-evm'

describe('HardhatDB', () => {
    it('getAccountByAddress', async () => {
        let rethnet = new RethnetClient();
        const caller = Address.fromString("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");

        // Add funds to caller
        await rethnet.insertAccount(caller.buf);
        await rethnet.setAccountBalance(caller.buf, BigInt("0xffffffff"));

        // send some value
        const receiver = Address.fromString("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
        const sendValue: Transaction = {
            from: caller.buf,
            to: receiver.buf,
            value: 100n
        };

        let sendValueChanges = await rethnet.call(sendValue);

        // receiver should have 100 (0x64) wei
        expect(sendValueChanges["0x70997970c51812dc3a010c7d01b50e0d17dc79c8"].info.balance)
            .to.equal("0x64")

        // create a contract
        const createContract: Transaction = {
            from: caller.buf,

            // minimal creation bytecode
            input: Buffer.from("3859818153F3", "hex"),
        };

        let createContractChanges = await rethnet.call(createContract);

        expect(createContractChanges["0x5fbdb2315678afecb367f032d93f642f64180aa3"])
            .to.exist;
        // check that the code hash is not the null hash (i.e., the address has code)
        expect(createContractChanges["0x5fbdb2315678afecb367f032d93f642f64180aa3"].info.code_hash)
            .to.not.equal("0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470")
    });
});
