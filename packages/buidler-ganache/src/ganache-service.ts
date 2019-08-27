import Ganache from "ganache-core";

export class GanacheService {
  private readonly _server: any;

  constructor(configs?: {}, env?: {}) {
    console.log(">> Ganache Service > Initializing server");

    // Only for debug
    // console.log(configs);
    // console.log(env);

    this._server = Ganache.server();
  }

  public async send(method: string, params: any): Promise<any> {
    return this._server.send(method, params);
  }

  public startServer(configs?: {}, env?: {}) {
    console.log(">> Ganache Service > Starting server");

    // Only for debug
    // console.log(env);

    this._server.listen(8545, function(err: any, blockchain: any) {
      if (err) {
        console.log(">> Ganache Error:\n");
        console.log(err);
      }

      // Only for debug
      // console.log(blockchain);
    });
  }

  public stopServer() {
    console.log(">> Ganache Service > Stopping server");
    // TODO Make this function
    this._server.close();
  }

  public processConfigs(configs?: {}, env?: {}) {
    console.log(">> Ganache Service > Processing configs");
    // TODO Make this function
  }
}
