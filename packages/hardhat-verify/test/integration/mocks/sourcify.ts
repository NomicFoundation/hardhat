import {
  Dispatcher,
  getGlobalDispatcher,
  MockAgent,
  setGlobalDispatcher,
} from "undici";

const mockAgent = new MockAgent({
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10,
});

const client = mockAgent.get("https://sourcify.dev");

export const mockEnvironmentSourcify = () => {
  let globalDispatcher: Dispatcher;
  // enable network connections for everything but etherscan API
  mockAgent.enableNetConnect(/^(?!https:\/\/sourcify\.dev)/);

  before(() => {
    globalDispatcher = getGlobalDispatcher();
    setGlobalDispatcher(mockAgent);
  });

  after(() => {
    setGlobalDispatcher(globalDispatcher);
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
