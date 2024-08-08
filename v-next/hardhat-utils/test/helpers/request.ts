import type { Interceptable } from "../../src/request.js";

import { after, before } from "node:test";

import { getTestDispatcher } from "../../src/request.js";

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

  after(() => {
    mockAgent.enableNetConnect();
  });

  return interceptor;
};
