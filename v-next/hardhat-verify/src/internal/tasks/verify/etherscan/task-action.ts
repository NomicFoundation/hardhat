import type { VerifyActionArgs } from "../types.js";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import { getChainDescriptor } from "../../../chains.js";
import { Etherscan } from "../../../etherscan.js";

import { resolveArgs } from "./arg-resolution.js";

const verifyEtherscanAction: NewTaskActionFunction<VerifyActionArgs> = async (
  taskArgs,
  { config, network },
) => {
  if (config.verify.etherscan.enabled === false) {
    // eslint-disable-next-line no-restricted-syntax -- TODO: throw
    throw new Error();
  }

  const { address, constructorArgs, libraries, contract, force } =
    await resolveArgs(taskArgs);

  const { provider, networkName } = await network.connect();
  const chainDescriptor = await getChainDescriptor(
    networkName,
    provider,
    config.chainDescriptors,
  );

  if (chainDescriptor.blockExplorers.etherscan === undefined) {
    // eslint-disable-next-line no-restricted-syntax -- TODO: throw
    throw new Error();
  }

  const etherscan = new Etherscan(
    await config.verify.etherscan.apiKey.get(),
    chainDescriptor.blockExplorers.etherscan.apiUrl,
    chainDescriptor.blockExplorers.etherscan.url,
  );
};

export default verifyEtherscanAction;
