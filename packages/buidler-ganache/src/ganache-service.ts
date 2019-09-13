import debug from "debug";
import { URL } from "url";

const log = debug("buidler:plugin:ganache-service");
log.color = "6";

export class GanacheService {
  public static error: Error;
  public static optionValidator: any;

  public static getDefaultOptions(): GanacheOptions {
    return {
      url: "http://127.0.0.1:8545",
      gasPrice: 20000000000,
      gasLimit: 6721975,
      defaultBalanceEther: 100,
      totalAccounts: 10,
      hardfork: "petersburg",
      allowUnlimitedContractSize: false,
      locked: false,
      hdPath: "m/44'/60'/0'/0/",
      keepAliveTimeout: 5000
    };
  }

  public static async create(options: any): Promise<GanacheService> {
    // Get Ganache lib
    const Ganache = await import("ganache-core");

    // Get and initialize option validator
    const { default: optionsSchema } = await import("./ganache-options-ti");
    const { createCheckers } = await import("ts-interface-checker");
    const { GanacheOptionsTi } = createCheckers(optionsSchema);
    GanacheService.optionValidator = GanacheOptionsTi;

    return new GanacheService(Ganache, options);
  }

  private readonly _server: any;
  private readonly _options: GanacheOptions;

  private constructor(Ganache: any, options: any) {
    log("Initializing server");

    // Validate and Transform received options before initialize server
    this._options = this._validateAndTransformOptions(options);

    try {
      // Initialize server and provider with given options
      this._server = Ganache.server(this._options);

      // Register server and system error handlers
      this._registerSystemErrorsHandlers();
    } catch (e) {
      // Verify the expected error or throw it again
      if (e.name === "TypeError") {
        e.message = "One or more invalid values in ganache network options";
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

  public _validateAndTransformOptions(options: GanacheOptions): any {
    const validatedOptions: any = options;

    // Validate and parse hostname and port from URL (this validation is priority)
    const url = new URL(options.url);
    if (url.hostname !== "locahost" && url.hostname !== "127.0.0.1") {
      throw new Error("Config: ganache.hostname must resolve to locahost");
    }

    // Validate all options agains validator
    try {
      GanacheService.optionValidator.check(options);
    } catch (e) {
      e.message = e.message.replace("value.", "Config: ganache.");
      throw e;
    }

    // Test for unsupported commands
    if (options.accounts !== undefined) {
      throw new Error("Config: ganache.accounts unsupported for this network");
    }

    // Transform needed options to Ganache core server (not using SnakeCase lib for performance)
    validatedOptions.hostname = url.hostname;
    validatedOptions.port = Number(url.port) || 80;

    const optionsToInclude = [
      "accountsKeyPath",
      "dbPath",
      "defaultBalanceEther",
      "totalAccounts",
      "unlockedAccounts"
    ];
    for (const [key, value] of Object.entries(options)) {
      if (value && optionsToInclude.includes(key)) {
        validatedOptions[this._snakeCase(key)] = value;
        delete validatedOptions[key];
      }
    }

    return validatedOptions;
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

  private _snakeCase(str: string) {
    return str.replace(/([A-Z]){1}/g, match => `_${match.toLowerCase()}`);
  }
}
