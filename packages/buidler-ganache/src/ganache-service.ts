import debug from "debug";

const log = debug("buidler:plugin:ganache-service");

export class GanacheService {
  public static error: Error;

  public static getDefaultOptions(): GanacheOptions {
    return {
      hostname: "127.0.0.1",
      port: 8545,
      gasPrice: "20000000000",
      gasLimit: 0x6691b7,
      defaultBalanceEther: 100,
      totalAccounts: 10
    };
  }

  public static async create(options: any): Promise<GanacheService> {
    const { default: Ganache } = await import("ganache-core");
    return new GanacheService(Ganache, options);
  }

  private readonly _server: any;
  private readonly _options: GanacheOptions;

  private constructor(Ganache: any, options: any) {
    log("Initializing server");

    // Validate received options before initialize server
    this._options = this.validateOptions(options);

    // Only for debug
    // console.log(this._options);

    this._server = Ganache.server(this._options);
    this._registerSystemErrorsHandlers();
  }

  public async startServer() {
    // Verify service state before start (TODO Maybe extract this to a decorator)
    this._checkForServiceErrors();

    try {
      log("Starting server");

      // Only for debug
      // console.log(env);

      // Get port and hostname from validated options
      const port = this._options.port;
      const hostname = this._options.hostname;

      // Start server with current configs (port and hostname)
      await new Promise((resolve, reject) => {
        this._server.once("listening", resolve);
        this._server.once("error", reject);
        this._server.listen(port, hostname);
      });
    } catch (e) {
      if (!GanacheService.error) {
        log(e.message || e);
        GanacheService.error = new Error(`start server > ${e.message}`);
      }
    }

    // Verify service state after start (TODO Maybe extract this to a decorator)
    this._checkForServiceErrors();
  }

  public async stopServer() {
    // Verify service state before continue (TODO Maybe extract this to a decorator)
    this._checkForServiceErrors();

    try {
      log("Stopping server");

      // Stop server and Wait for it
      await new Promise((resolve, reject) => {
        this._server.close((err: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } catch (e) {
      if (!GanacheService.error) {
        log(e.message || e);
        GanacheService.error = new Error(`stop server > ${e.message}`);
      }
    }

    // Verify service state before continue (TODO Maybe extract this to a decorator)
    this._checkForServiceErrors();
  }

  // TODO remove this function
  public async send(method: string, params: any): Promise<any> {
    return this._server.send(method, params);
  }

  public validateOptions(options: any) {
    // TODO Put here some ganache options validations
    // console.log(options);

    // Transform service options to Ganache core server
    options.account_keys_path = options.accountKeysPath;
    options.db_path = options.dbPath;
    options.default_balance_ether = options.defaultBalanceEther;
    options.fork_block_number = options.forkBlockNumber;
    options.total_accounts = options.totalAccounts;
    options.unlocked_accounts = options.unlockedAccounts;

    return options;
  }

  private _registerSystemErrorsHandlers() {
    const server = this._server;

    // Add listener for general server errors
    server.on("error", function(err: any) {
      if (!GanacheService.error && err) {
        log(err.message || err);
        GanacheService.error = err;
      }
    });

    // Add listener for process uncaught errors (warning: this may catch non plugin related errors)
    // process.on("uncaughtException", function(e) {
    //   log("Uncaught Exception", e.message);
    //   server.close(function(err: any) {
    //     if (!GanacheService.error && err) {
    //       log(err.message || err.stack || err);
    //       GanacheService.error = err;
    //     }
    //   });
    // });

    // Add listener for standard POSIX signal SIGINT (usually generated with <Ctrl>+C)
    // process.on("SIGINT", function() {
    //   log("SIGINT detected");
    //   server.close(function(err: any) {
    //     if (!GanacheService.error && err) {
    //       log(err.message || err.stack || err);
    //       GanacheService.error = err;
    //     }
    //   });
    // });

    // TODO Maybe in the future, in new threat, some kind of ping checker to the server (every 30 seg)
  }

  private _checkForServiceErrors() {
    if (GanacheService.error) {
      // Close server (if needed)
      if (this._server) {
        this._server.close();
      }

      throw new Error(GanacheService.error.message);
    }
  }
}

export interface GanacheOptions {
  hostname?: string;
  accountKeysPath?: string;
  // account_keys_path?: string;
  accounts?: object[];
  allowUnlimitedContractSize?: boolean;
  blockTime?: number;
  dbPath?: string;
  // db_path?: string;
  debug?: boolean;
  defaultBalanceEther?: number;
  // default_balance_ether?: number;
  fork?: string | object;
  forkBlockNumber?: string | number;
  // fork_block_number?: string | number;
  gasLimit?: number;
  gasPrice?: string;
  hardfork?: "byzantium" | "constantinople" | "petersburg";
  hdPath?: string;
  // hd_path?: string;
  locked?: boolean;
  logger?: {
    log(msg: string): void;
  };
  mnemonic?: string;
  network_id?: number;
  networkId?: number;
  port?: number;
  seed?: any;
  time?: Date;
  totalAccounts?: number;
  // total_accounts?: number;
  unlockedAccounts?: string[];
  // unlocked_accounts?: string[];
  verbose?: boolean;
  vmErrorsOnRPCResponse?: boolean;
  ws?: boolean;
}

// function isInstanceOfGanacheOption(object: any): object is GanacheOptions {
//   // TODO Maybe use this function to make type validatatin in custom options
//   return object.discriminator === "I-AM-A";
// }
