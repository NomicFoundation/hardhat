# 7. Setting up the front-end

- Now that our contract is ready and tested, we're going to create a Dapp to interact with it.
- A Dapp is just a normal App that interacts with an Ethereum network 
- We choose Facebook's [Create React App](https://github.com/facebook/create-react-app) for this tutorial to avoid any kind of build configuration problem and get to the basics of building a dapp as soon as possible.
- For interacting with our Dapp we're going to need Dapp browser
- A Dapp browser is just any browser that supports an Ethereum wallet
- These wallets inject an Ethereum provider into the browser (we're going to see more about this provider on the upcoming sections). In this section we are just going to set up the React App and install Metamask. 

## Setting up a React App

- Let's start by setting up the project
- Open a terminal on your project root directory and run `npx create-react-app frontend`. This command will create a new React app inside a folder named `frontend` (you should see this folder alongside `contracts` and `test`).
- After installation ends, run `cd frontend and npm install --save bootstrap`. This will install Bootstrap for some basic styling with. 

### Folder structure

::: tip
If you're already familiar with React Apps, skip to the next section.
:::

- Create React App will generate 3 different folders:
  - `public/` for static assets
  - `src/` the code of the app
  - `src/components` contains the react components

- It'll also generate `index.js` which will be responsible of initializing the app
- Take a moment or so to inspect the files
- To initialize the project run `npm start`. If everything went well, your app should be available on `http://localhost:3000`.
- It'll also automatically reload when your code changes   

## Connecting to the browser

- We're going to use Metamask, the most popular browser wallet. 
- Follow [this guide](https://metamask.zendesk.com/hc/en-us/articles/360015489531-Getting-Started-With-MetaMask-Part-1-) to install Metamask 
- When installation completes, open Metamask and follow the instructions to create a new wallet.

### Connecting Metamask to Buidler EVM
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


