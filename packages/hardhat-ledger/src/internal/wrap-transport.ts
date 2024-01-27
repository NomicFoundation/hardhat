import Eth from "@ledgerhq/hw-app-eth";
import Transport from "@ledgerhq/hw-transport";

import { EthWrapper } from "../types";

export function wrapTransport(transport: Transport): EthWrapper {
  return new Eth(transport);
}
