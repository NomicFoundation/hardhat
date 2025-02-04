// TODO: Bring this file back with Hardhat Verify
// import { assert } from "chai";

// import { getApiKeyAndUrls } from "../../src/utils/getApiKeyAndUrls.js";

// describe("getApiKeyAndUrls", function () {
//   it("should return the correct API URLs when given a string", function () {
//     const apiKeyList = getApiKeyAndUrls("testApiKey", {
//       network: "mainnet",
//       chainId: 1,
//       urls: {
//         apiURL: "https://api.etherscan.io/api",
//         browserURL: "https://etherscan.io",
//       },
//     });

//     assert.deepEqual(apiKeyList, [
//       "testApiKey",
//       "https://api.etherscan.io/api",
//       "https://etherscan.io",
//     ]);
//   });

//   it("should return the correct API URLs when given an apiKey object", function () {
//     const apiKeyList = getApiKeyAndUrls(
//       {
//         goerli: "goerliApiKey",
//         sepolia: "sepoliaApiKey",
//       },
//       {
//         network: "goerli",
//         chainId: 5,
//         urls: {
//           apiURL: "https://api-goerli.etherscan.io/api",
//           browserURL: "https://goerli.etherscan.io",
//         },
//       }
//     );

//     assert.deepEqual(apiKeyList, [
//       "goerliApiKey",
//       "https://api-goerli.etherscan.io/api",
//       "https://goerli.etherscan.io",
//     ]);
//   });

//   it("should return the correct API URLs when given a string and the network is not mainnet", function () {
//     const apiKeyList = getApiKeyAndUrls("goerliApiKey", {
//       network: "goerli",
//       chainId: 5,
//       urls: {
//         apiURL: "https://api-goerli.etherscan.io/api",
//         browserURL: "https://goerli.etherscan.io",
//       },
//     });

//     assert.deepEqual(apiKeyList, [
//       "goerliApiKey",
//       "https://api-goerli.etherscan.io/api",
//       "https://goerli.etherscan.io",
//     ]);
//   });

//   it("should throw when given an object and a nonexistent network name", function () {
//     assert.throws(
//       () =>
//         getApiKeyAndUrls(
//           {
//             goerli: "goerliApiKey",
//             sepolia: "sepoliaApiKey",
//           },
//           {
//             network: "mainnet",
//             chainId: 1,
//             urls: {
//               apiURL: "https://api.etherscan.io/api",
//               browserURL: "https://etherscan.io",
//             },
//           }
//         ),
//       /No etherscan API key configured for network mainnet/
//     );
//   });
// });
