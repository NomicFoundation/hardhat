import debug from "debug";
import Ganache from "ganache-core";

const log = debug("buidler:plugin:ganache");

export class GanacheService {
  public static getDefaultOptions(): GanacheOptions {
    return {
      port: 8545,
      hostname: "127.0.0.1",
      gasPrice: "20000000000",
      gasLimit: 0x6691b7,
      default_balance_ether: 100,
      total_accounts: 10
    };
  }

  private readonly _server: any;
  private readonly _verbose: boolean;
  private readonly _options: GanacheOptions;

  constructor(env?: any) {
    log("Ganache Service > Initializing server");

    // Only for debug
    // console.log(configs);
    // console.log(env.config);

    this._verbose = env.buidlerArguments.verbose;
    this._options = GanacheService.getDefaultOptions();

    // TODO Merge default options with end resolved config options

    this._server = Ganache.server(this._options);

    this._registerSystemErrorsHandlers();
  }

  public async send(method: string, params: any): Promise<any> {
    return this._server.send(method, params);
  }

  public startServer() {
    log("Ganache Service > Starting server\n");

    // Only for debug
    // console.log(env);

    const port = this._options.port;
    const hostname = this._options.hostname;
    const listeningListener = (err: any, blockchain: any) => {
      if (err) {
        log("Ganache Initialization Error:\n");
        log(err);
      }

      // Only for debug
      // console.log(">> Ganache Event:\n");
      // console.log(blockchain);
    };

    this._server.listen(port, hostname, listeningListener);
  }

  public stopServer() {
    log("Ganache Service > Stopping server");

    // TODO Make this function
    this._server.close();
  }

  public validateOptions(options: any) {}

  private _registerSystemErrorsHandlers() {
    const server = this._server;

    process.on("uncaughtException", function(e) {
      log("Ganache Service > Uncaught Error:");
      log(e.stack);
      server.close(function(err: any) {
        if (err) {
          log(err.stack || err);
        }
        process.exit();
      });
      process.exit(1);
    });

    process.on("SIGINT", function() {
      log("Ganache Service > SIGINT Error:");
      server.close(function(err: any) {
        if (err) {
          log(err.stack || err);
        }
        process.exit();
      });
    });
  }
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
  logger?: { log(msg: string): void };
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
