import type { DispatcherOptions } from "../../src/request.js";
import type { Interceptable } from "undici";

import { after, before } from "node:test";

import { MockAgent } from "undici";

export function getTestDispatcherOptions(
  options: DispatcherOptions = {},
): DispatcherOptions & { isTestDispatcher: true } {
  return {
    ...options,
    isTestDispatcher: true,
  };
}

const mockAgent = new MockAgent({
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10,
});

export const mockPool: Interceptable = mockAgent.get("http://localhost:3000");

export const setupRequestMocking: () => void = () => {
  before(() => {
    mockAgent.disableNetConnect();
  });

  after(() => {
    mockAgent.enableNetConnect();
  });
};
