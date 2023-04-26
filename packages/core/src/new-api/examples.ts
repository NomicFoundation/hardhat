// Some definitions
//  Future: representation of a future value, which may require on-chain interaction (e.g. deploy a contract, an already existing contract)
//  FutureFactory: Methods exposed by IgnitionModuleBuidler which create factories

import { buildModule } from "./build-module";

// Examples

const moduleWithASingleContract = buildModule("Module1", (m) => {
  const contract1 = m.contract("Contract1", []);

  return { contract1 };
});

const moduleWithUnexportedContract = buildModule("Module2", (m) => {
  const contract1 = m.contract("Contract1", [1, 2, 3]);

  // We don't export this, but we still need to run every future,
  // so it's included in module.futures
  const _contract2 = m.contract("Contract2", []);

  return { contract1 };
});

const moduleWithSubmodule = buildModule("Module3", (m) => {
  const { contract1 } = m.useModule(moduleWithASingleContract);
  // ^ This is typed 😎

  const contract3 = m.contract("Contract3", []);

  return { contract1, contract3 };
});

// We pring these modules

console.log(moduleWithASingleContract);

console.log();
console.log();

console.log(moduleWithUnexportedContract);

console.log();
console.log();

console.log(moduleWithSubmodule);

// Major todos:
//   - Validation: I think both per-future and global validations can be run using this same representation, as it still is a graph and also uses adjacency lists.
//
//   - Batching: I think each batch can be Set<Future>, and we can batch with this representation, including the malaga rule, as explained above.
