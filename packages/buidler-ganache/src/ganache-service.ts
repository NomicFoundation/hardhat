import Ganache from "ganache-core";
import {string} from "@nomiclabs/buidler/internal/core/params/argumentTypes";

export class GanacheService {
  private readonly _server: any;
  private readonly _verbose: boolean;
  private _options: GanacheOptions;

  constructor(env?: any) {
    console.log(">> Ganache Service > Initializing server");

    // Only for debug
    // console.log(configs);
    // console.log(env.config);

    this._verbose = env.buidlerArguments.verbose;
    this._options = {
      hostname: "127.0.0.1",
      port: 8545
    };
    this._server = Ganache.server(this._options);
  }

  public async send(method: string, params: any): Promise<any> {
    return this._server.send(method, params);
  }

  public startServer() {
    console.log(">> Ganache Service > Starting server");

    // Only for debug
    // console.log(env);

    const port = this._options.port;
    const hostname = this._options.hostname;
    const listeningListener = (err: any, blockchain: any) => {
      if (err) {
        console.log(">> Ganache Error:\n");
        console.log(err);
      }

      // Only for debug
      // console.log(blockchain);
    };

    this._server.listen(port, hostname, listeningListener);
  }

  public stopServer() {
    console.log(">> Ganache Service > Stopping server");

    // TODO Make this function
    this._server.close();
  }

  public processConfigs(configs?: any) {}
}

export interface GanacheOptions {
  // Details: https://github.com/trufflesuite/ganache-core#options
  account_keys_path?: string;
  accounts?: object[];
  allowUnlimitedContractSize?: boolean;
  blockTime?: number;
  db_path?: string;
  debug?: boolean;
  default_balance_ether?: number;
  fork?: string | object;
  fork_block_number?: string | number;
  gasLimit?: number;
  gasPrice?: string;
  hardfork?: "byzantium" | "constantinople" | "petersburg";
  hd_path?: string;
  locked?: boolean;
  logger?: { log(msg: string): void; };
  mnemonic?: string;
  network_id?: number;
  networkId?: number;
  hostname?: string;
  port?: number;
  seed?: any;
  time?: Date;
  total_accounts?: number;
  unlocked_accounts?: string[];
  verbose?: boolean;
  vmErrorsOnRPCResponse?: boolean;
  ws?: boolean;
}
