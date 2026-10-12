import type {
  EthereumProvider,
  RequestArguments,
} from "../src/types/providers.js";
import type {
  Interceptable,
  TestDispatcher,
} from "@nomicfoundation/hardhat-utils/request";

import EventEmitter from "node:events";
import { after, before } from "node:test";

import { getTestDispatcher } from "@nomicfoundation/hardhat-utils/request";

export class MockEthereumProvider
  extends EventEmitter
  implements EthereumProvider
{
  public callCount = 0;

  constructor(public returnValues: Record<string, any> = {}) {
    super();
  }

  public async request(args: RequestArguments): Promise<any> {
    const returnValue = this.returnValues[args.method];
    if (returnValue !== undefined) {
      this.callCount++;
      return typeof returnValue === "function" ? returnValue() : returnValue;
    }

    throw new Error("Method not supported");
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }

  public send(): Promise<any> {
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

/**
 * Sets up a mock agent for tests.
 *
 * Use `interceptor` to declare the mocked responses, and `dispatcher` as the
 * dispatcher passed to the request helpers. They must be kept apart: undici's
 * interceptors only work when they are composed onto the mock agent, as the
 * mock pool returned by `MockAgent#get` doesn't support them.
 */
export const initializeTestDispatcher = async (
  options: InitializeOptions = {},
): Promise<{ interceptor: Interceptable; dispatcher: TestDispatcher }> => {
  const { url = "http://localhost", timeout } = options;

  const mockAgent = await getTestDispatcher({ timeout });
  const interceptor = mockAgent.get(url);

  before(() => {
    mockAgent.disableNetConnect();
  });

  after(async () => {
    mockAgent.enableNetConnect();
    await mockAgent.close();
  });

  return { interceptor, dispatcher: mockAgent };
};
