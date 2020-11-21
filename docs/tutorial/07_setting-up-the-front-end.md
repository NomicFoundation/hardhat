# 7. Setting up the front-end

With the backend contract written and tested, the next step is to have a front end for users to interact with it. Typically this front end is a web page executing
JavaScript. This way the user can interact with the decentralized application (dapp) and the Ethereum blockchain without having to send any private information to
the web server. For this tutorial we chose to use Facebook's [React Framework](https://reactjs.org/tutorial/tutorial.html).

Browsers don't have native support for Ethereum yet. To use a dapp users need to install a wallet browser extension, such as [MetaMask](https://metamask.io/). 
Wallet browser extensions provide the JavaScript running inside the web page with an object, called a provider, that is used to access the API.



## Setting up a React application

React development requires a server-side application to serve the content to the browser.

1. Open a terminal and change to the project root directory.
2. Create the project:
   ```bash
   npx create-react-app frontend
   cd frontend
   ```
3. Install the [Bootstrap](https://getbootstrap.com/) theme for the graphic style:
   ```bash
   npm install --save bootstrap
   ```
4. Start the HTTP server to serve the React app:
   ```bash
   npm start 
   ```
5. View the React application. If you built it on your own machine, go to [http://localhost:3000](http://localhost:3000). 
   This application updates automatically when you edit the relevant files.
6. To actually apply the bootstrap theme, edit `frontend/src/index.js` to include this line, preferably somewhere near the top:
   ```js
   import 'bootstrap/dist/css/bootstrap.css'
   ```


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

1. Open a terminal and change to the project root directory (or any other directory that isn't under `frontend`).
2. Start the Buidler EVM in standalone mode, rather than on a temporary basis for a specific test: 
   ```bash
   npx buidler node
   ```
   This starts the Buidler EVM listening on [http://localhost:8545](http://localhost:8545). 
   To verify that you can browse there to get the message:
   ```
   {"jsonrpc":"2.0","id":null,"error":{"code":-32700,"message":"Parse error: Unexpected end of JSON input"}}
   ```
   It is an error, because the browser did not send a legitimate [JSON RPC](https://www.jsonrpc.org/specification) request, but the fact you got
   this error shows that there is an HTTP server there. 
   
   If you want the Buidler EVM to accept connections from other computers, because it is more convenient to run the browser elsewhere,
   use this command. Depending on the network configuration, you might also have to open TCP port 8545 in a firewall.
   ```bash
   npx buidler node --hostname 0.0.0.0
   ```    
   
3. Click the Metamask icon (![Metamask icon](https://raw.githubusercontent.com/qbzzt/qbzzt.github.io/master/metamask-logo.png)) in the top right corner of the browser.
4. If you are running the Buidler EVM and the browser on the same computer, click the currently selected network 
   (by default **Main Ethereum Network**) and select **Localhost 8545**. If you are using a Buidler EVM on a different device, select **Custom RPC** and enter
   the following details:
      
   | Field        | Value                                                  |
   |--------------|--------------------------------------------------------|
   | Network Name | Buidler EVM                                            |
   | New RPC URL  | http:// &lt;IP of Buidler EVM&gt; :8545                |
   | Chain ID     | 31337 (unless you specify a different value)           |

::: warning
If you stop the Buidler EVM and then start it again, MetaMask may be unable to communicate with it until you connect 
to another network and then return to **Localhost 8545**. Also, you may need [reset the nonce value](https://btcgeek.com/how-to-set-nonce-in-metamask/).
:::
