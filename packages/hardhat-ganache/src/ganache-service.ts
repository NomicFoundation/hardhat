import debug from "debug";
import { NomicLabsHardhatPluginError } from "hardhat/internal/core/errors";
import { URL } from "url";

const log = debug("hardhat:plugin:ganache-service");

declare interface GanacheOptions {
  url: string;
  keepAliveTimeout?: number;
  accountKeysPath?: string; // Translates to: account_keys_path
  accounts?: object[];
  allowUnlimitedContractSize?: boolean;
  blockTime?: number;
  dbPath?: string; // Translates to: db_path
  debug?: boolean;
  defaultBalanceEther?: number; // Translates to: default_balance_ether
  fork?: string | object;
  forkBlockNumber?: string | number; // Translates to: fork_block_number
  gasLimit?: number;
  gasPrice?: string | number;
  hardfork?:
    | "byzantium"
    | "constantinople"
    | "petersburg"
    | "istanbul"
    | "muirGlacier";
  hdPath?: string; // Translates to: hd_path
  hostname?: string;
  locked?: boolean;
  logger?: {
    log(msg: string): void;
  };
  mnemonic?: string;
  networkId?: number;
  port?: number;
  seed?: any;
  time?: any; // Date
  totalAccounts?: number; // Translates to: total_accounts
  unlockedAccounts?: string[]; // Translates to: unlocked_accounts
  verbose?: boolean;
  vmErrorsOnRPCResponse?: boolean;
  ws?: boolean;
}

const DEFAULT_PORT = 7545;

export class GanacheService {
  public static error?: Error;
  public static optionValidator: any;

  public static getDefaultOptions(): GanacheOptions {
    return {
      url: `http://127.0.0.1:${DEFAULT_PORT}`,
      gasPrice: 20000000000,
      gasLimit: 6721975,
      defaultBalanceEther: 1000,
      totalAccounts: 10,
      hardfork: "muirGlacier",
      allowUnlimitedContractSize: false,
      locked: false,
      hdPath: "m/44'/60'/0'/0/",
      keepAliveTimeout: 5000,
    };
  }

  public static async create(options: any): Promise<GanacheService> {
    // We use this weird way of importing this library here as a workaround
    // to this issue https://github.com/trufflesuite/ganache-core/issues/465
    const Ganache = (() => require)()("ganache");

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
      if (e instanceof Error) {
        if (e.name === "TypeError") {
          if (GanacheService.error === undefined) {
            const error = new NomicLabsHardhatPluginError(
              "@nomiclabs/hardhat-ganache",
              `Ganache plugin config is invalid: ${e.message}`,
              e
            );

            log("Failed to initialize GanacheService\n", error);
            GanacheService.error = error;
          }
        } else {
          throw new NomicLabsHardhatPluginError(
            "@nomiclabs/hardhat-ganache",
            `Failed to initialize GanacheService: ${e.message}`,
            e
          );
        }
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
      await new Promise<void>((resolve, reject) => {
        // eslint-disable-next-line prefer-const
        let onError: (err: Error) => void;

        const onListening = () => {
          this._server.removeListener("error", onError);
          resolve();
        };

        onError = (err) => {
          this._server.removeListener("listening", onListening);
          reject(err);
        };

        this._server.once("listening", onListening);
        this._server.once("error", onError);
        this._server.listen(port, hostname);
      });
    } catch (e: any) {
      const error = new NomicLabsHardhatPluginError(
        "@nomiclabs/hardhat-ganache",
        `Failed to start GanacheService: ${e.message}`,
        e
      );

      if (GanacheService.error === undefined) {
        log("Failed to start GanacheService\n", error);
        GanacheService.error = error;
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
      await new Promise<void>((resolve, reject) => {
        this._server.close((err: Error) => {
          if (err !== undefined && err !== null) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } catch (e: any) {
      const error = new NomicLabsHardhatPluginError(
        "@nomiclabs/hardhat-ganache",
        `Failed to stop GanacheService: ${e.message}`,
        e
      );

      if (GanacheService.error === undefined) {
        log("Failed to stop GanacheService\n", error);
        GanacheService.error = error;
      }
    }

    this._checkForServiceErrors();
  }

  private _validateAndTransformOptions(options: GanacheOptions): any {
    const validatedOptions: any = options;

    // Validate and parse hostname and port from URL (this validation is priority)
    const url = new URL(options.url);
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      throw new NomicLabsHardhatPluginError(
        "@nomiclabs/hardhat-ganache",
        "Ganache network only works with localhost"
      );
    }

    // Validate all options agains validator
    try {
      GanacheService.optionValidator.check(options);
    } catch (e: any) {
      throw new NomicLabsHardhatPluginError(
        "@nomiclabs/hardhat-ganache",
        `Ganache network config is invalid: ${e.message}`,
        e
      );
    }

    // Test for unsupported commands
    if (options.accounts !== undefined) {
      throw new NomicLabsHardhatPluginError(
        "@nomiclabs/hardhat-ganache",
        "Config: ganache.accounts unsupported for this network"
      );
    }

    // Transform needed options to Ganache core server (not using SnakeCase lib for performance)
    validatedOptions.hostname = url.hostname;

    validatedOptions.port =
      url.port !== undefined && url.port !== ""
        ? parseInt(url.port, 10)
        : DEFAULT_PORT;

    const optionsToInclude = [
      "accountsKeyPath",
      "dbPath",
      "defaultBalanceEther",
      "totalAccounts",
      "unlockedAccounts",
    ];
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && optionsToInclude.includes(key)) {
        validatedOptions[this._snakeCase(key)] = value;
        delete validatedOptions[key];
      }
    }

    return validatedOptions;
  }

  private _registerSystemErrorsHandlers() {
    const server = this._server;

    // Add listener for general server errors
    server.on("error", function (err: any) {
      if (
        GanacheService.error === undefined &&
        err !== undefined &&
        err !== null
      ) {
        log("An error occurred in GanacheService\n", err);
        GanacheService.error = err;
      }
    });
  }

  private _checkForServiceErrors() {
    if (GanacheService.error !== undefined) {
      if (this._server !== undefined) {
        this._server.close();
      }

      throw new NomicLabsHardhatPluginError(
        "@nomiclabs/hardhat-ganache",
        `An error occurred in GanacheService: ${GanacheService.error.message}`,
        GanacheService.error
      );
    }
  }

  private _snakeCase(str: string) {
    return str.replace(/([A-Z]){1}/g, (match) => `_${match.toLowerCase()}`);
  }
}
