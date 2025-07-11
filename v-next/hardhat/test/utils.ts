import type {
  EthereumProvider,
  RequestArguments,
} from "../src/types/providers.js";
import type { Interceptable } from "@nomicfoundation/hardhat-utils/request";

import EventEmitter from "node:events";
import { after, afterEach, before } from "node:test";

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

export function createTestEnvManager() {
  const changes = new Set<string>();
  const originalValues = new Map<string, string | undefined>();

  afterEach(() => {
    // Revert changes to process.env based on the originalValues Map entries
    changes.forEach((key) => {
      const originalValue = originalValues.get(key);
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    });
    changes.clear();
  });

  return {
    setEnvVar(name: string, value: string): void {
      // Before setting a new value, save the original value if it hasn't been saved yet
      if (!changes.has(name)) {
        originalValues.set(name, process.env[name]);
        changes.add(name);
      }
      process.env[name] = value;
    },
  };
}

interface InitializeOptions {
  url?: string;
  timeout?: number;
}

export const initializeTestDispatcher = async (
  options: InitializeOptions = {},
): Promise<Interceptable> => {
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

  return interceptor;
};
