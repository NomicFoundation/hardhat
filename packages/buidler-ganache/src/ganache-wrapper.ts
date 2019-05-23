import ganache from "ganache-core";
import portScanner from "portscanner";
import url from "url";

export class GanacheWrapper {
  protected _hostname: string;
  protected _port: number;
  protected _server: any;

  constructor(ganacheHostUrl: string) {
    const hostURL = url.parse(ganacheHostUrl);

    this._hostname = hostURL.hostname as string;
    this._port = parseInt(hostURL.port as string, 10);
  }

  public async isRunning(): Promise<boolean> {
    const portStatus = await portScanner.checkPortStatus(
      this._port,
      this._hostname
    );

    return portStatus === "open";
  }

  public start(): void {
    this._server = ganache.server();
    this._server.listen(this._port);
  }

  public stop(): void {
    this._server.close();
  }
}
