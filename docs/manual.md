# Manual Test Doc

> To knock off the rough edges

## Tests

---

### **Try and deploy a module that doesn't exist**

---

#### <u>_Arrange_</u>

Setup ignition in a new hardhat project based on the getting started guide.

#### <u>_Act_</u>

Run a deploy with a module that doesn't exist

#### <u>_Assert_</u>

Check that a sensible error message is displayed

---

### **Try and run a module with a validation error**

---

#### <u>_Arrange_</u>

Setup ignition in a new hardhat project based on the getting started guide.

Tweak the module so that it has a problem that will be caught by validation (ADD_MORE_DETAILS_HERE).

#### <u>_Act_</u>

Run a deploy with a invalid module

#### <u>_Assert_</u>

Check that a sensible error message is displayed

---

### **Deploy to Sepolia testnet**

---

#### <u>_Arrange_</u>

Ensure you have an infura/alchemy RPC endpoint set up for Sepolia as well as an ETH address with Sepolia ETH that you don't mind pasting the privkey in plaintext for. I used metamask

Setup the network settings in the `hardhat.config.js` of the example you want to test

#### <u>_Act_</u>

Run a deploy/test from the example directory you set up

#### <u>_Assert_</u>

Check that deployment was successful, or results match expected (for instance, on-hold for multisig)
