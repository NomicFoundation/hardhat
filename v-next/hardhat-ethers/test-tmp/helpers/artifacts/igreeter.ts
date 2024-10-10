import type { Artifact } from "@ignored/hardhat-vnext/types/artifacts";

export const CONTRACT: Artifact = {
  _format: "hh3-artifact-1",
  contractName: "IGreeter",
  sourceName: "contracts/IGreeter.sol",
  abi: [
    {
      constant: true,
      inputs: [],
      name: "greet",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  ],
  bytecode: "0x",
  deployedBytecode: "0x",
  linkReferences: {},
  deployedLinkReferences: {},
};
