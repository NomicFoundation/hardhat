import { expect } from 'chai';
import { DefaultStateManager } from '@nomicfoundation/ethereumjs-statemanager'
import { AccountData, Address } from '@nomicfoundation/ethereumjs-util'

import { RethnetClient, Account } from '../../rethnet-evm'

describe('HardhatDB', () => {
    it('getAccountByAddress', async () => {
        let rethnet = new RethnetClient();

        let dummy_address = Address.zero();

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
