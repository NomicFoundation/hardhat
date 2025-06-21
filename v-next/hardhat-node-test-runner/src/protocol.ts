import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import fs from "node:fs";
import net from "node:net";
import * as os from "node:os";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

function getSocketPath(): string {
  if (os.platform() === "win32") {
    return "\\\\.\\pipe\\hardhat_node_test";
  } else {
    return "/tmp/hardhat_node_test.sock";
  }
}

export function isChildTestProcess(): boolean {
  return process.env.NODE_TEST_CONTEXT !== undefined;
}

export class TestProtocolClient {
  readonly #socketPath: string;

  constructor() {
    this.#socketPath = getSocketPath();
  }

  public async requestSecretInput(
    interruptor: string,
    inputDescription: string,
  ): Promise<string> {
    const response = await this.#request({
      type: "requestSecretInput",
      params: { interruptor, inputDescription },
    });

    assertHardhatInvariant(
      response.type === "secretInputResponse",
      "Expected response to be a secretInputResponse",
    );

    const { secretInput } = response.params;

    return secretInput;
  }

  async #request(msg: Message): Promise<Message> {
    return new Promise((resolve) => {
      const socket = net.createConnection(this.#socketPath, () => {
        socket.write(JSON.stringify(msg));
      });

      socket.on("data", (data) => {
        const message = JSON.parse(data.toString());
        socket.end();
        resolve(message);
      });
    });
  }
}

export class TestProtocolServer {
  readonly #socketPath: string;
  #server?: net.Server;
  readonly #secretInputCache: Map<string, string> = new Map();
  readonly #hre: HardhatRuntimeEnvironment;

  constructor(hre: HardhatRuntimeEnvironment) {
    this.#hre = hre;
    this.#socketPath = getSocketPath();
  }

  public start(): void {
    if (process.platform !== "win32" && fs.existsSync(this.#socketPath)) {
      fs.unlinkSync(this.#socketPath); // remove stale socket
    }

    this.#server = net.createServer((socket) => {
      socket.on("data", async (data) => {
        await this.#handleData(socket, data);
      });
    });

    this.#server.listen(this.#socketPath);
  }

  public end(): void {
    this.#server?.close();
  }

  async #handleData(socket: net.Socket, data: Buffer): Promise<void> {
    const message = this.#parseMessage(data);

    if (message.type === "requestSecretInput") {
      await this.#handleRequestSecretInput(socket, message);
    }
  }

  async #handleRequestSecretInput(
    socket: net.Socket,
    message: RequestSecretInputMessage,
  ): Promise<void> {
    const { interruptor, inputDescription } = message.params;
    const cacheKey = [interruptor, inputDescription].join();

    let secretInput: string;

    if (this.#secretInputCache.has(cacheKey)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- already checked presence
      secretInput = this.#secretInputCache.get(cacheKey)!;
    } else {
      secretInput = await this.#hre.interruptions.requestSecretInput(
        interruptor,
        inputDescription,
      );
      this.#secretInputCache.set(cacheKey, secretInput);
    }

    await this.#send(socket, {
      type: "secretInputResponse",
      params: { secretInput },
    });
  }

  async #send(socket: net.Socket, msg: Message): Promise<void> {
    socket.write(JSON.stringify(msg));
  }
  #parseMessage(data: Buffer): Message {
    return JSON.parse(data.toString());
  }
}

export type Message = SecretInputResponseMessage | RequestSecretInputMessage;

export interface SecretInputResponseMessage {
  type: "secretInputResponse";
  params: {
    secretInput: string;
  };
}

export interface RequestSecretInputMessage {
  type: "requestSecretInput";
  params: {
    interruptor: string;
    inputDescription: string;
  };
}
