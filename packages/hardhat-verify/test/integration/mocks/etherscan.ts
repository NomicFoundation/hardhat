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

const client = mockAgent.get("https://api-hardhat.etherscan.io");

export const mockEnvironment = () => {
  let globalDispatcher: Dispatcher;
  // enable network connections for everything but etherscan API
  mockAgent.enableNetConnect(/^(?!https:\/\/api-hardhat\.etherscan\.io)/);

  before(() => {
    globalDispatcher = getGlobalDispatcher();
    setGlobalDispatcher(mockAgent);
  });

  after(() => {
    setGlobalDispatcher(globalDispatcher);
  });
};

export const interceptIsVerified = (response: any) =>
  client
    .intercept({
      path: /\/api\?action=getsourcecode&address=0x[a-fA-F0-9]{40}&apikey=[a-zA-Z0-9]+&module=contract/,
    })
    .reply(200, response);

export const interceptVerify = (response: any, statusCode: number = 200) =>
  client
    .intercept({
      path: "/api",
      method: "POST",
      // cSpell:ignore constructorArguements -- This is the spelling used by the Etherscan API
      body: /apikey=[a-zA-Z0-9]+&module=contract&action=verifysourcecode&contractaddress=0x[a-fA-F0-9]{40}&sourceCode=.+&codeformat=solidity-standard-json-input&contractname=.+&compilerversion=.+&constructorArguements=.*/,
    })
    .reply(statusCode, response);

export const interceptGetStatus = (response: any, statusCode: number = 200) =>
  client
    .intercept({
      path: /\/api\?action=checkverifystatus&apikey=[a-zA-Z0-9]+&guid=.+&module=contract/,
      method: "GET",
    })
    .reply(statusCode, response);
