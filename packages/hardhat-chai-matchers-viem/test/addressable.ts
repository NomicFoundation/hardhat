import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { getContract, createWalletClient, custom } from "viem";
import { AssertionError, expect } from "chai";

import "../src/internal/add-chai-matchers";

describe("Addressable matcher", () => {
  // create dummy transport so we can create wallets and get contracts
  const transport = custom({
    async request() {},
  });

  const account = privateKeyToAccount(generatePrivateKey());
  const address = account.address;
  const wallet = createWalletClient({ account, transport });
  const contract = getContract({ abi: [], address, client: wallet });

  const otherAccount = privateKeyToAccount(generatePrivateKey());
  const otherAddress = otherAccount.address;
  const otherWallet = createWalletClient({ account: otherAccount, transport });
  const otherContract = getContract({
    abi: [],
    address: otherAddress,
    client: otherWallet,
  });

  const elements = [
    { name: "address", object: address, class: address },
    { name: "account", object: account, class: address },
    { name: "wallet", object: wallet, class: address },
    { name: "contract", object: contract, class: address },
    { name: "other address", object: otherAddress, class: otherAddress },
    { name: "other account", object: otherAccount, class: otherAddress },
    { name: "other wallet", object: otherWallet, class: otherAddress },
    { name: "other contract", object: otherContract, class: otherAddress },
  ];

  for (const el1 of elements)
    for (const el2 of elements) {
      const expectEqual = el1.class === el2.class;

      describe(`expect "${el1.name}" to equal "${el2.name}"`, () => {
        if (expectEqual) {
          it("should not revert", () => {
            expect(el1.object).to.equal(el2.object);
          });
        } else {
          it("should revert", () => {
            expect(() => expect(el1.object).to.equal(el2.object)).to.throw(
              AssertionError,
              `expected '${el1.class}' to equal '${el2.class}'.`
            );
          });
        }
      });

      describe(`expect "${el1.name}" to not equal "${el1.name}"`, () => {
        if (expectEqual) {
          it("should revert", () => {
            expect(() => expect(el1.object).to.not.equal(el2.object)).to.throw(
              AssertionError,
              `expected '${el1.class}' to not equal '${el2.class}'.`
            );
          });
        } else {
          it("should not revert", () => {
            expect(el1.object).to.not.equal(el2.object);
          });
        }
      });
    }
});
