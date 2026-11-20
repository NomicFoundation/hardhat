import type { NewUtilsTaskActionFunction } from "../../types.js";

import { parseAddressArgument } from "../address.js";
import { parseBlockArgument } from "../block.js";
import { requestQuantity } from "../connection.js";

interface FetchNonceActionArguments {
  address: string;
  block: string;
}

const fetchNonceAction: NewUtilsTaskActionFunction<
  FetchNonceActionArguments
> = async ({ address, block }, hre) => {
  const params = [
    await parseAddressArgument(address, "address"),
    parseBlockArgument(block, "block"),
  ];

  console.log(
    (await requestQuantity(hre, "eth_getTransactionCount", params)).toString(),
  );
};

export default fetchNonceAction;
