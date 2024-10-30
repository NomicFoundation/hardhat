import type { Artifact } from "@ignored/hardhat-vnext/types/artifacts";

export const CONTRACT: Artifact = {
  _format: "hh3-artifact-1",
  contractName: "Example",
  sourceName: "contracts/Example.sol",
  abi: [
    {
      inputs: [],
      name: "f",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ],
  bytecode:
    "0x6080604052348015600f57600080fd5b50606d80601d6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c806326121ff014602d575b600080fd5b60336035565b005b56fea2646970667358221220e71f3f5db86a8465dd931055e5d9b4a4de866d30e29948af2dd1bef803d2923764736f6c63430008130033",
  deployedBytecode:
    "0x6080604052348015600f57600080fd5b506004361060285760003560e01c806326121ff014602d575b600080fd5b60336035565b005b56fea2646970667358221220e71f3f5db86a8465dd931055e5d9b4a4de866d30e29948af2dd1bef803d2923764736f6c63430008130033",
  linkReferences: {},
  deployedLinkReferences: {},
};
