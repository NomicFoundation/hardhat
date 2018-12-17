import { EventEmitter } from "events";
import { EthereumProvider } from "web3x/providers";

// TODO: This may not be the correct interface, see
// https://ethereum-magicians.org/t/eip-1193-ethereum-provider-javascript-api/640/31?u=alcuadrado
export type IEthereumProvider = EthereumProvider & EventEmitter;
