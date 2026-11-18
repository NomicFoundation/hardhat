import type { NewUtilsTaskActionFunction } from "../../types.js";

import { parseAddressArgument } from "../address.js";
import { parseBlockArgument } from "../block.js";
import { requestQuantity } from "../connection.js";

interface FetchBalanceActionArguments {
  address: string;
  block: string;
}

const fetchBalanceAction: NewUtilsTaskActionFunction<
  FetchBalanceActionArguments
> = async ({ address, block }, hre) => {
  const params = [
    await parseAddressArgument(address, "address"),
    parseBlockArgument(block, "block"),
  ];

  console.log(
    (await requestQuantity(hre, "eth_getBalance", params)).toString(),
  );
};

export default fetchBalanceAction;
