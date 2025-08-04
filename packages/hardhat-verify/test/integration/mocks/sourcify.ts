import { MockAgent } from "undici";
import { setMockDispatcher } from "../../../src/internal/undici";

const mockAgent = new MockAgent({
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10,
});

const client = mockAgent.get("https://sourcify.dev");

export const mockEnvironmentSourcify = () => {
  // enable network connections for everything but etherscan API
  mockAgent.enableNetConnect(/^(?!https:\/\/sourcify\.dev)/);

  before(() => {
    setMockDispatcher(mockAgent);
  });

  after(() => {
    setMockDispatcher(undefined);
  });
};

export const interceptSourcifyIsVerified = (response: any) =>
  client
    .intercept({
      method: "GET",
      path: /\/server\/check-all-by-addresses\?addresses=0x[a-fA-F0-9]{40}&chainIds=[0-9]+/,
    })
    .reply(200, response);

export const interceptSourcifyVerify = (
  response: any,
  statusCode: number = 200
) =>
  client
    .intercept({
      path: "/server",
      method: "POST",
    })
    .reply(statusCode, response);
