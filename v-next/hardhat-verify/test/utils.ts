import type {
  Interceptable,
  TestDispatcher,
} from "@nomicfoundation/hardhat-utils/request";
import type {
  EthereumProvider,
  RequestArguments,
} from "hardhat/types/providers";

import assert from "node:assert/strict";
import EventEmitter from "node:events";
import { afterEach, beforeEach } from "node:test";

import { getTestDispatcher } from "@nomicfoundation/hardhat-utils/request";

export class MockEthereumProvider
  extends EventEmitter
  implements EthereumProvider
{
  public callCount = 0;

  constructor(public returnValues: Record<string, any> = {}) {
    super();
  }

  public async request(args: RequestArguments): Promise<unknown> {
    if (this.returnValues[args.method] !== undefined) {
      this.callCount++;
      return this.returnValues[args.method];
    }

    throw new Error("Method not supported");
  }

  public close(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public send(): Promise<unknown> {
    throw new Error("Method not implemented.");
  }
  public sendAsync(): void {
    throw new Error("Method not implemented.");
  }
}

interface InitializeOptions {
  url?: string;
  timeout?: number;
}

interface PendingInterceptorInternal {
  method?: string | RegExp | ((path: string) => boolean);
  path: string | RegExp | ((path: string) => boolean);
  times: number | null;
  timesInvoked?: number;
}

export function initializeTestDispatcher(options: InitializeOptions = {}): {
  readonly interceptable: Interceptable;
} {
  const { url = "http://localhost", timeout } = options;

  let mockAgent: TestDispatcher;
  let interceptable: Interceptable;

  beforeEach(async () => {
    mockAgent = await getTestDispatcher({ timeout });
    interceptable = mockAgent.get(url);
    mockAgent.disableNetConnect();
  });

  afterEach(async () => {
    const pendingInterceptors = mockAgent.pendingInterceptors();

    if (pendingInterceptors.length > 0) {
      const format = (v: string | RegExp | Function | undefined) =>
        typeof v === "string"
          ? v
          : v instanceof RegExp
            ? v.toString()
            : typeof v === "function"
              ? "[Function]"
              : "[undefined]";

      const formatted = pendingInterceptors
        .map(
          ({
            method,
            path,
            times = 0,
            timesInvoked = 0,
          }: PendingInterceptorInternal) =>
            `${format(method)} ${format(path)} (invoked: ${timesInvoked}/${times})`,
        )
        .join("\n  ");

      assert.fail(
        `❌ Not all interceptors were consumed.\n  Pending:\n  ${formatted}`,
      );
    }

    mockAgent.enableNetConnect();
    await mockAgent.close();
  });

  return {
    get interceptable() {
      return interceptable;
    },
  };
}
