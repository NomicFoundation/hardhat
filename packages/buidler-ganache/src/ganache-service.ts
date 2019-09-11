import debug from "debug";
import { createCheckers } from "ts-interface-checker";

import GanacheOptionsTi from "./ganache-options-ti";
import { GanacheOptions } from "./types";

const log = debug("buidler:plugin:ganache-service");
log.color = "6";

export class GanacheService {
  public static error: Error;

  public static getDefaultOptions(): GanacheOptions {
    return {
      url: "http://127.0.0.1:8545",
      gasPrice: 20000000000,
      gasLimit: 6721975,
      defaultBalanceEther: 100,
      totalAccounts: 10,
      keepAliveTimeout: 5000
    };
  }

  public static getMergedOptions(
    defaultOptions: any,
    customOptions: any
  ): GanacheOptions {
    // Merge default options with config ones (with custom options priority)
    const mergedOptions = { ...defaultOptions, ...customOptions };

    // TODO Take in consideration array object merging

    return mergedOptions;
  }

  public static async create(options: any): Promise<GanacheService> {
    const { default: Ganache } = await import("ganache-core");
    // const { createCheckers } = await import("ts-interface-checker");
    return new GanacheService(Ganache, options);
  }

  private readonly _server: any;
  private readonly _options: GanacheOptions;

  private constructor(Ganache: any, options: any) {
    log("Initializing server");

    // Validate received options before initialize server
    this._options = this._validateOptions(options);

    // Only for debug
    // console.log(this._options);

    try {
      // Initialize server and provider with given options
      this._server = Ganache.server(this._options);

      // Register server and system error handlers
      this._registerSystemErrorsHandlers();
    } catch (e) {
      // Verify the expected error or throw it again
      if (e.name === "TypeError") {
        e.message = `One or more invalid values in ganache network options`;
        if (!GanacheService.error) {
          log(e.message || e);
          GanacheService.error = e;
        }
      } else {
        throw e;
      }
    }
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
      e.message = `Start Server > ${e.message}`;
      if (!GanacheService.error) {
        log(e.message || e);
        GanacheService.error = e;
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
      e.message = `Stop Server > ${e.message}`;
      if (!GanacheService.error) {
        log(e.message || e);
        GanacheService.error = e;
      }
    }

    // Verify service state before continue (TODO Maybe extract this to a decorator)
    this._checkForServiceErrors();
  }

  public _validateOptions(options: GanacheOptions): any {
    const validatedOptions: any = options;

    // Validate and parse hostname and port from URL
    const url = new URL(options.url);
    validatedOptions.hostname = url.hostname;
    validatedOptions.port = url.port || 80;
    if (options.hostname !== "locahost" && options.hostname !== "127.0.0.1") {
      throw new Error("Config: hostname must resolve to locahost");
    }

    const { checker } = createCheckers(GanacheOptionsTi);

    // TODO This checker is not Working DUNNO WHY (11/9)
    log(checker, "< this Not should be undefined");
    // checker.check(options);

    // Transform service options to Ganache core server
    if (options.accountKeysPath) {
      validatedOptions.account_keys_path = options.accountKeysPath;
    }
    if (options.dbPath) {
      validatedOptions.db_path = options.dbPath;
    }
    if (options.defaultBalanceEther) {
      validatedOptions.default_balance_ether = options.defaultBalanceEther;
    }
    if (options.forkBlockNumber) {
      validatedOptions.fork_block_number = options.forkBlockNumber;
    }
    if (options.totalAccounts) {
      validatedOptions.total_accounts = options.totalAccounts;
    }
    if (options.unlockedAccounts) {
      validatedOptions.unlocked_accounts = options.unlockedAccounts;
    }

    return validatedOptions;
  }

  private _registerSystemErrorsHandlers() {
    const server = this._server;

    // Add listener for general server errors
    server.on("error", function(err: any) {
      console.log("PASEEE");
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
