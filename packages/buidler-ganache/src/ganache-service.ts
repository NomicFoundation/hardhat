import debug from "debug";
import Ganache from "ganache-core";

const log = debug("buidler:plugin:ganache");

export class GanacheService {
  public static error: Error;
  public static getDefaultOptions(): GanacheOptions {
    return {
      hostname: "127.0.0.1",
      port: 8545,
      gasPrice: "20000000000",
      gasLimit: 0x6691b7,
      default_balance_ether: 100,
      total_accounts: 10
    };
  }

  private readonly _server: any;
  private readonly _options: GanacheOptions;

  constructor(options: any) {
    log("Ganache Service > Initializing server");

    // Validate received options before initialize server
    this._options = this.validateOptions(options);

    // Only for debug
    // console.log(this._options);

    this._server = Ganache.server(this._options);
    this._registerSystemErrorsHandlers();
  }

  public async startServer() {
    // Verify service state before start (TODO Extract this to a decorator)
    this._checkForServiceErrors();

    try {
      log("Ganache Service > Starting server");

      // Only for debug
      // console.log(env);

      const port = this._options.port;
      const hostname = this._options.hostname;
      const listeningListener = (err: any, blockchain: any) => {
        if (err) {
          log("Ganache Initialization Error:");
          log(err);
        }

        // Only for debug
        // console.log(">> Ganache Event:\n");
        // console.log(blockchain);
      };

      this._server.listen(port, hostname, listeningListener);
      await delay(10);
    } catch (e) {
      throw new Error("Starting ganache error");
    }

    // Verify service state after start (TODO Extract this to a decorator)
    this._checkForServiceErrors();
  }

  public async stopServer() {
    // Verify service state before continue (TODO Extract this to a decorator)
    this._checkForServiceErrors();

    try {
      log("Ganache Service > Stopping server");

      // TODO Make this function
      this._server.close();
      await delay(10);
    } catch (e) {
      // Only for debug
      console.log(e);

      throw new Error("Stopping ganache error");
    }

    // Verify service state before continue (TODO Extract this to a decorator)
    this._checkForServiceErrors();
  }

  public async send(method: string, params: any): Promise<any> {
    return this._server.send(method, params);
  }

  public validateOptions(options: any) {
    // TODO Put here some ganache options validations
    return options;
  }

  private _registerSystemErrorsHandlers() {
    const server = this._server;

    // Add listener for server errors
    server.on("error", function(err: any) {
      log(err.message || err);
      GanacheService.error = err;
    });

    server.on("", function(err: any) {
      log(err.message || err);
      GanacheService.error = err;
    });

    // Add listener for process uncaught errors
    process.on("uncaughtException", function(e) {
      log("Error:", e.message);
      server.close(function(err: any) {
        if (err) {
          log(err.message || err.stack || err);
          GanacheService.error = err;
        }
      });
    });

    // Add listener for standard POSIX signal SIGINT (usually generated with <Ctrl>+C)
    process.on("SIGINT", function() {
      log("SIGINT detected");
      server.close(function(err: any) {
        if (err) {
          log(err.message || err.stack || err);
          GanacheService.error = err;
        }
      });
    });
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

export interface GanacheOptions extends Ganache.IServerOptions {
  hostname?: string;
}

function isInstanceOfGanacheOption(object: any): object is GanacheOptions {
  return object.discriminator === "I-AM-A";
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
