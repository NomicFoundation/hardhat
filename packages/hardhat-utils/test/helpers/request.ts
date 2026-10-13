import type { Interceptable, TestDispatcher } from "../../src/request.js";

import { after, before } from "node:test";

import { getTestDispatcher } from "../../src/request.js";

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
