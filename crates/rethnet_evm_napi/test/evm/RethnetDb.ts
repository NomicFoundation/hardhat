import { expect } from 'chai';
import { Address } from '@nomicfoundation/ethereumjs-util'

import { Block, Host, Rethnet, Transaction } from '../..'

describe('Rethnet DB', () => {
    const caller = Address.fromString("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    const receiver = Address.fromString("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");

    // TODO: insertBlock, setAccountCode, setAccountStorageSlot
    it('getAccountByAddress', async () => {
        let rethnet = new Rethnet();

        await rethnet.insertAccount(caller.buf);
        let account = await rethnet.getAccountByAddress(caller.buf);

        expect(account?.balance).to.equal(0n);
        expect(account?.nonce).to.equal(0n);
    });
    it('setAccountBalance', async () => {
        let rethnet = new Rethnet();

        await rethnet.insertAccount(caller.buf);
        await rethnet.setAccountBalance(caller.buf, 100n);

        let account = await rethnet.getAccountByAddress(caller.buf);

        expect(account?.balance).to.equal(100n);
        expect(account?.nonce).to.equal(0n);
    });
    it('setAccountNonce', async () => {
        let rethnet = new Rethnet();

        await rethnet.insertAccount(caller.buf);
        await rethnet.setAccountNonce(caller.buf, 5n);

        let account = await rethnet.getAccountByAddress(caller.buf);

        expect(account?.balance).to.equal(0n);
        expect(account?.nonce).to.equal(5n);
    });
    it('call', async () => {
        let rethnet = new Rethnet();

        // Add funds to caller
        await rethnet.insertAccount(caller.buf);
        await rethnet.setAccountBalance(caller.buf, BigInt("0xffffffff"));

        // send some value
        const sendValue: Transaction = {
            from: caller.buf,
            to: receiver.buf,
            gasLimit: BigInt(1000000),
            value: 100n
        };

        const block: Block = {
            number: BigInt(1),
            timestamp: BigInt(Math.ceil(new Date().getTime() / 1000))
        };
        const host: Host = {
            chainId: BigInt(0),
            allowUnlimitedContractSize: false
        };
        let sendValueChanges = await rethnet.dryRun(sendValue, block, host);

        // receiver should have 100 (0x64) wei
        expect(sendValueChanges.state["0x70997970c51812dc3a010c7d01b50e0d17dc79c8"].info.balance)
            .to.equal("0x64")

        // create a contract
        const createContract: Transaction = {
            from: caller.buf,

            gasLimit: BigInt(1000000),

            // minimal creation bytecode
            input: Buffer.from("3859818153F3", "hex"),
        };

        let createContractChanges = await rethnet.dryRun(createContract, block, host);

        expect(createContractChanges.state["0x5fbdb2315678afecb367f032d93f642f64180aa3"])
            .to.exist;
        // check that the code hash is not the null hash (i.e., the address has code)
        expect(createContractChanges.state["0x5fbdb2315678afecb367f032d93f642f64180aa3"].info.code_hash)
            .to.not.equal("0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470")
    });
});
