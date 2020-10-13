# 7. Setting up the front-end

With the backend contract written and tested, the next step is to have a front end for users to interact with it. Typically this front end is a web page executing
JavaScript. This way the user can interact with the decentralized application (dapp) and the Ethereum blockchain without having to rely on the web server. For this tutorial 
we chose to use Facebook's [React Framework](https://reactjs.org/tutorial/tutorial.html).

Browsers don't have native support for Ethereum yet. To use a dapp users need to install a wallet browser extension, such as [MetaMask](https://metamask.io/). 
This kind of extension injects an Ethereum provider object into the browse that can be accessed from JavaScript code running in a web page.


## Setting up a React application

To create a React application that will serve the code to talk to the Ethereum blockchain we need to create a React project:

1. Open a terminal and change to the project root directory.
1. Create the project:
```bash
npx create-react-app frontend
cd frontend
```
3. Install the [Bootstrap](https://www.w3schools.com/bootstrap4/default.asp) theme for the graphic style:
```bash
npm install --save bootstrap
```
4. Start the HTTP server to serve the React app:
```bash
npm start 
```
5. View the React application. If you built it on your own machine, go to [http://localhost:3000](http://localhost:3000). 
   This application updates automatically when you edit the relevant files.


## Connecting to the browser

In this tutorial we use [Metamask](https://metamask.io/), which is the most popular browser wallet. Follow 
[this guide](https://metamask.zendesk.com/hc/en-us/articles/360015489531-Getting-Started-With-MetaMask-Part-1-) to install Metamask, and then open 
Metamask and follow the instructions to create a new wallet.

::: note
In Ethereum the term **wallet** has two separate meanings:

- The software that stores a user's private and public keys and export Ethereum functions. For example the Metamask software you just installed which provides
  JavaScript running inside the web page with Ethereum functionality.
- The twelve word passphrase that is used to derive private keys, public keys, and accounts.
:::

### Connecting Metamask to Buidler EVM

By default Metamask connects to the main Ethereum network. However, for testing and development purposes we want the wallet to connect to EVM. 

GOON

- Besides the Main Ethereum Network (known as mainnet), Metamask allows the user to connect its provider to test networks such as Rinkeby, Ropsten and Goerli.
- Metamask also allows the user to connect to development networks which normally run on localhost.
- We will take advantage of this feature and connect Metamask to Buidler EVM
- We already learned that Buidler will always spin up an in-memory instance of Buidler EVM on startup by default (e.g: when running a task), but it's also possible to run Buidler EVM in a standalone fashion so that external clients can connect to it through localhost. This could be MetaMask, your Dapp front-end, or a script.
- To run Buidler EVM in this way, run `npx buidler node`:
```
$ npx buidler node
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```
- This will expose a JSON-RPC interface to Buidler EVM. To use it connect your wallet or application to `http://localhost:8545`.
- Open Metamask and click on Main Ethereum Network, a list of networks should be displayed. Select Localhost 8545, it should connect to the local node of Buidler EVM.


