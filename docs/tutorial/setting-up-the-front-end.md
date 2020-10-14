# 7. Setting up the front-end

With the backend contract written and tested, the next step is to have a front end for users to interact with it. Typically this front end is a web page executing
JavaScript. This way the user can interact with the decentralized application (dapp) and the Ethereum blockchain without having to rely on the web server. For this tutorial 
we chose to use Facebook's [React Framework](https://reactjs.org/tutorial/tutorial.html).

Browsers don't have native support for Ethereum yet. To use a dapp users need to install a wallet browser extension, such as [MetaMask](https://metamask.io/). 
This kind of extension injects an Ethereum provider object into the browse that can be accessed from JavaScript code running in a web page.


## Setting up a React application

The first step to create the React application that will serve the code to talk to the Ethereum blockchain we need to create a React project:

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

By default Metamask connects to the main Ethereum network. However, for development and testing purposes we want to connect to the Buidler EVM that runs our
application.

1. Start the Buidler EVM in standalone mode, rather than on a temporary basis for a specific test: 
```bash
npx buidler node
```
This starts the Buidler EVM listening on [http://localhost:8545](http://localhost:8545). You can browse there to get the message:
```
{"jsonrpc":"2.0","id":null,"error":{"code":-32700,"message":"Parse error: Unexpected end of JSON input"}}
```
2. Click the Metamask icon (![Metamask icon](https://raw.githubusercontent.com/qbzzt/qbzzt.github.io/master/metamask-logo.png)) in the top right corner of the browser.
3. Click the currently selected network (by default **Main Ethereum Network** and select **Localhost 8545**.
