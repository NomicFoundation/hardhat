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

export const mockEnvironment = () => {
  let globalDispatcher: Dispatcher;
  mockAgent.disableNetConnect();

  before(() => {
    globalDispatcher = getGlobalDispatcher();
    setGlobalDispatcher(mockAgent);
  });

  after(() => {
    setGlobalDispatcher(globalDispatcher);
  });
};

const client = mockAgent.get("https://api-hardhat.etherscan.io");

export const interceptIsVerified = (response: any) => {
  client
    .intercept({
      path: /\/api\?action=getsourcecode&address=0x[a-fA-F0-9]{40}&apikey=[a-zA-Z0-9]+&module=contract/,
      method: "GET",
    })
    .reply(200, response);
};
