// import { expect } from "chai";
// import { Address } from "@nomicfoundation/ethereumjs-util";

// import {
//   Blockchain,
//   BlockConfig,
//   Config,
//   Rethnet,
//   RethnetContext,
//   SpecId,
//   StateManager,
//   Transaction,
// } from "../../index.js";

// describe("Rethnet", () => {
//   const caller = Address.fromString(
//     "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
//   );
//   const receiver = Address.fromString(
//     "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
//   );

//   const context = new RethnetContext();

//   let blockchain: Blockchain;
//   let stateManager: StateManager;
//   let rethnet: Rethnet;

//   beforeEach(async function () {
//     blockchain = new Blockchain(async function (
//       _blockNumber: bigint
//     ): Promise<Buffer> {
//       return Buffer.allocUnsafe(0);
//     });

//     stateManager = new StateManager(context);

//     const cfg: Config = {
//       chainId: BigInt(0),
//       specId: SpecId.GrayGlacier,
//       limitContractCodeSize: BigInt(2n) ** BigInt(32n),
//       disableEip3607: true,
//     };
//     rethnet = new Rethnet(blockchain, stateManager, cfg);
//   });

//   it("call", async () => {
//     // Add funds to caller
//     await stateManager.insertAccount(caller.buf, {
//       nonce: 0n,
//       balance: BigInt("0xffffffff"),
//     });

//     // send some value
//     const sendValue: Transaction = {
//       from: caller.buf,
//       to: receiver.buf,
//       gasLimit: BigInt(1000000),
//       value: 100n,
//     };

//     const block: BlockConfig = {
//       number: BigInt(1),
//       timestamp: BigInt(Math.ceil(new Date().getTime() / 1000)),
//     };
//     let sendValueChanges = await rethnet.dryRun(sendValue, block);

//     // receiver should have 100 (0x64) wei
//     expect(
//       BigInt(
//         sendValueChanges .state["0x70997970c51812dc3a010c7d01b50e0d17dc79c8"]
//           .info.balance
//       )
//     ).to.equal(BigInt("0x64"));

//     // create a contract
//     const createContract: Transaction = {
//       from: caller.buf,

//       gasLimit: BigInt(1000000),

//       // minimal creation bytecode
//       input: Buffer.from("3859818153F3", "hex"),
//     };

//     let createContractChanges = await rethnet.dryRun(createContract, block);

//     expect(
//       createContractChanges.state["0x5fbdb2315678afecb367f032d93f642f64180aa3"]
//     ).to.exist;
//     // check that the code hash is not the null hash (i.e., the address has code)
//     expect(
//       createContractChanges.state["0x5fbdb2315678afecb367f032d93f642f64180aa3"]
//         .info.code_hash
//     ).to.not.equal(
//       "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
//     );
//   });
// });
