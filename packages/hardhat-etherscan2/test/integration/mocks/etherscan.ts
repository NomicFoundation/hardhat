import { MockAgent } from "undici";

const agent = new MockAgent({ connections: 1 });
agent.disableNetConnect();

const client = agent.get("https://api-hardhat.etherscan.io");
client
  .intercept({
    path: /\/api\?action=getsourcecode&address=0x[a-fA-F0-9]{40}&apikey=[a-zA-Z0-9]+&module=contract/,
    method: "GET",
  })
  .reply(200, {
    message: "OK",
    result: [{ SourceCode: "source-code-of-the-deployed-contract" }],
  });

// eslint-disable-next-line import/no-default-export
export default agent;
