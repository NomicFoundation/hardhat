import type { NewUtilsTaskActionFunction } from "../../types.js";

import { parseAddressArgument } from "../address.js";
import { parseBlockArgument } from "../block.js";
import { requestHex } from "../connection.js";

interface FetchCodeActionArguments {
  address: string;
  block: string;
}

const fetchCodeAction: NewUtilsTaskActionFunction<
  FetchCodeActionArguments
> = async ({ address, block }, hre) => {
  const params = [
    await parseAddressArgument(address, "address"),
    parseBlockArgument(block, "block"),
  ];

  console.log(await requestHex(hre, "eth_getCode", params));
};

export default fetchCodeAction;
