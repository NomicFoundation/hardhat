# 10. Connecting the components

- Let's transform the App into a Dapp.

## 10.1. Connecting the wallet
- The first thing that a user needs to do in the Dapp, is connecting to their wallet.
- We already have a button inside the `ConnectWallet` component that triggers the `_connectWallet` method, so we're going to write the needed logic inside it
- To connect to Metamask, we have to use an object that Metamask injects into the browser: `window.ethereum`. Calling its method `window.ethereum.enable()` will return all the wallets account in an array format. 
- We'll keep the first account as the signer.

```jsx
_connectWallet() {
  const [selectedAddress] = window.ethereum.enable();
}
```

- Since `ethereum.enable()` will return a Promise, we need to call it using `async/await`

```jsx {1,2}
async _connectWallet() {
  const [selectedAddress] = await window.ethereum.enable();
}
```

- Once we have the address, the wallet is connected and we can initialize an Ethereum Provider which will allow us to interact with the Ethereum Virtual Machine, in our case Buidler EVM.

- We'll create an `_initialize` method which will receive the user's address as parameter. This method will store the address in the Dapp.

- With an Ethereum address we'll be ready to initialize `ethers`, our Ethereum provider:

```jsx {4,7-13,15,16}
  async _connectWallet() {
    const [selectedAddress] = await window.ethereum.enable();

    this._initialize(selectedAddress);
  }

  _initialize(userAddress) {
    this.setState({
      selectedAddress: userAddress,
    });

    this._intializeEthers();
  }

  async _intializeEthers() {
  }
```

- We already explained what's `ethers` when testing our contracts. Start by importing it at the top, we'll also import the `TokenArtifact` and `ContractAddress` that we generated on the previous step.
- We'll explain how to use them later:

```jsx {3,5,6}
import React from "react";

import { ethers } from "ethers";

import TokenArtifact from "../contracts/Token.json";
import contractAddress from "../contracts/contract-address.json";

// ...
```

- To connect the provider we do as follows:

```jsx {2}
  async _intializeEthers() {
    this._provider = new ethers.providers.Web3Provider(window.ethereum);
  }
```

- With our provider ready, we'll connect to our contract using `ethers.Contract()`. 
- This methods allows three parameters:
  - The contract address, which we already imported
  - The contract ABI, which is stored inside the Artifact, also already imported
  - A provider or signer, we want to get the selected account to sign transactions. We'll use the first signed of the provider, which will be the same as the `selectedAddress`

```jsx {4-8}
  async _intializeEthers() {
    this._provider = new ethers.providers.Web3Provider(window.ethereum);

    this._token = new ethers.Contract(
      contractAddress.Token,
      TokenArtifact.abi,
      this._provider.getSigner(0)
    );
  }
```

- Try running `npm start` and connecting your wallet. If everything went well, you should be able to connect and see your address:

[ insert image here ]


## 10.2. Reading from the contract's state
- We already connected the user's wallet and the Token contract to an Ethereum provider. Let's grab some data from it.

- We'll write some specific logic for this sample application, but they show you how to keep your Dapp and contract's state in sync, and how to send a transaction. You can reuse the same initialization pattern.

- We'll start by creating an `async` method `_getTokenData()`. This method will be called right after the initialization of ethers.

```jsx{8,11-12}
  _initialize(userAddress) {

    this.setState({
      selectedAddress: userAddress,
    });

    this._intializeEthers();
    this._getTokenData();
  }

  async _getTokenData() {
  }
```

- By this point you'll probably guess that `async` here is needed because we're going to interact with our Token contract which we already connected on the previous step. 
- After grabbing some data, we'll also store it inside our Dapp's state. 
- This can be achieved the following way:

```jsx {2-5}
  async _getTokenData() {
    const name = await this._token.name();
    const symbol = await this._token.symbol();

    this.setState({ tokenData: { name, symbol } });
  }
```

- Let's go further and grab the user's token balance. Create a new `async` function named `_updateBalance`. We'll follow the same approach as `_getTokenData`, so you might guess how the function looks:

```jsx
  async _updateBalance() {
    const balance = await this._token.balanceOf(this.state.selectedAddress);
    this.setState({ balance });
  }
```

- Here we're calling the contract's method `balanceOf` with the user address. After the promise resolves, we store the balance object in the Dapp state. We'll get shortly on how to display the balance.

- We can get the balance when the application loads, but since it can be changed from outside our Dapp, we'll add an interval to retrieve the data every 1 second.

- Let's wrap this functionality into a function which, besides calling it for the first time, will start the interval.

```jsx
  _startPollingData() {
    this._pollDataInterval = setInterval(() => this._updateBalance(), 1000);
    this._updateBalance();
  }
```

- Let's create its counterpart function:

```jsx
  _stopPollingData() {
    clearInterval(this._pollDataInterval);
    this._pollDataInterval = undefined;
  }
```

- And call it whe the application gets unmounted. Add the following code inside `componentWillUnmount()`:

```jsx{2}
  componentWillUnmount() {
    this._stopPollingData();
  }
```
- Now, let's add `_startPollingdata()` to our initialization function:

```jsx{9}
  _initialize(userAddress) {

    this.setState({
      selectedAddress: userAddress,
    });

    this._intializeEthers();
    this._getTokenData();
    this._startPollingData();
  }
```

::: tip
This is not the only way of reading the contract's state, it can also be done from a user action (i.e. clicking a button). Implementing those are similar, you have to use the contract's methods and save the results in the Dapp's state.
:::

- Since we're already working with async data, we can put the `Loading` component into good use. Go back to the Dapp's `render()` and add the following code below the `ConnectWallet` module. This will render the `Loading` component when the `tokenData` and the user's balance are being retrieved.

```jsx{16-18}
  render() {
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }

    if (!this.state.selectedAddress) {
      return (
        <ConnectWallet 
          connectWallet={() => this._connectWallet()} 
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    if (!this.state.tokenData || !this.state.balance) {
      return <Loading />;
    }

    // ...
```

- After the data has loaded, we'll want to display it in our Dapp. Let's add a header displaying the token information and the user's balance right after the address:

```jsx{13-15,17-21}
  render() {

    // ...

    if (!this.state.tokenData || !this.state.balance) {
      return <Loading />;
    }

    return (
      <div className="container p-4">
        <div className="row">
          <div className="col-12">
            <h1>
              {this.state.tokenData.name} ({this.state.tokenData.symbol})
            </h1>
            <p>
              Welcome <b>{this.state.selectedAddress}</b>, you have{" "}
              <b>
                {this.state.balance.toString()} {this.state.tokenData.symbol}
              </b>
              .
            </p>
          </div>
        </div>

        <hr />

        {/* ... */}

      </div>
    );
  }
```     

::: tip
Note that we're applying the `toString()` method to the user's balance. This is necessary because the balance comes as a [BigNumber](https://docs.ethers.io/ethers.js/html/api-utils.html#big-numbers) 
:::

- Now go to the browser. If everything went well, you should be able to see the token's information and your current token balance. Since we are polling the data, try changing your token balance and see if the interface refresh. You can change your token balance with the faucet we already created: `npx buidler --network localhost faucet <your_address>`.

[ INSERT IMAGE ]

## 10.3. Writing into the contract's state

- Let's see how we can write into the contract's state through a transfer module.

- We'll connect the `Transfer` component that we already created and end up signing a transaction through Metamask in order to effectively transfer tokens between two accounts.

- Let's start with a basic transfer function that will accept to parameters: `to` being an Ethereum address and `amount` being how many tokens to transfer.

- Calling the `transfer` method from our `Contract` interface, will return a `Promise` which will resolve after signing (or not) the transaction through Metamask. 

- After the transaction is signed, we'll update the state informing that a transaction is being sent. Then we call `wait()` on the transaction in order to get its receipt when mined.

- Finally, we'll update the user's balance.

- This is how your code should look:

```jsx
  async _transferTokens(to, amount) {
    const tx = await this._token.transfer(to, amount);
    this.setState({ txBeingSent: tx.hash });

    const receipt = await tx.wait();

    await this._updateBalance();
  }
```

- If the transaction goes its way through, we would see it reflected on the user's balance (going down). 

- As we mentioned, sending a transaction is the most complex kind of interaction. It takes some time to be mined and it can fail right away when being sent, or it can fail when being mined

- We'll want to wrap the whole function inside a `try...catch`. Also, if `await tx.wait()` resolves, we should check the `receipt`'s status flag being either 1 or 0, indicating success or fail respectively. 

- We can't know the exact error that make the transaction fail once it was mined (`receipt.status === 0`), so we throw a generic error.

```jsx{2,8-10,13-15}
  async _transferTokens(to, amount) {
    try {
      const tx = await this._token.transfer(to, amount);
      this.setState({ txBeingSent: tx.hash });

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      await this._updateBalance();
    } catch (error) {
      console.error(error);
    }
  }
```

- In order to make our UX better, we'll add some catching logic.

- First, we want to inform the user through the UI which error occurred. Remember the `TransactionErrorMessage` component? It'll show when the Dapp state's `transactionError` isn't undefined. 

```jsx{6}
  async _transferTokens(to, amount) {
    try {
      // ...
    } catch (error) {
      console.error(error);
      this.setState({ transactionError: error });
    }
  }
```

- There are different reasons why a transaction might fail, but we don't want to show an error when the user rejects the transaction. If a transaction is rejected by the user, we'll get the error code `4001`. We'll store it in a constant below our Dapp's imports:

```jsx{5}
// ...

import { NoTokensMessage } from "./NoTokensMessage";

const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

export class Dapp extends React.Component {
  // ...
}
```

- Now let's catch it:

```jsx{5-7}
  async _transferTokens(to, amount) {
    try {
      // ...
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      console.error(error);
      this.setState({ transactionError: error });
    }
  }
```

- There are two more considerations to take into account. On one side, we'll want to hide the `transactionError` if we call transfer again. On the other side, we can take advantage of the try-catch's `finally` instruction to inform that the `txBeingSent` has been completed. The full `_transferTokens` code should look like the following:

```jsx{3,22-24}
  async _transferTokens(to, amount) {
    try {
      this._dismissTransactionError();

      const tx = await this._token.transfer(to, amount);
      this.setState({ txBeingSent: tx.hash });

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }
      
      await this._updateBalance();
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      this.setState({ txBeingSent: undefined });
    }
  }
```

- Finally, we need to render some html to allow the user to use the `_transferTokens` functions. We'll take into account that the user might not have tokens to transfer. Being that the case we'll show up the `NoTokensMessage` (aka Faucet) component:

```jsx{9-24}
  render() {

    // ...

    return (
      
        {/* ... */}

        <div className="row">
          <div className="col-12">
            {this.state.balance.eq(0) && (
              <NoTokensMessage selectedAddress={this.state.selectedAddress} />
            )}
            {this.state.balance.gt(0) && (
              <Transfer
                transferTokens={(to, amount) =>
                  this._transferTokens(to, amount)
                }
                tokenSymbol={this.state.tokenData.symbol}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
```

- Now go to the browser and transfer some tokens. Feel free to experiment with the code and the ui before going to the next step.

[ INSERT IMAGE ]


## 10.4. Listening to `window.ethereum`

- When we started we assumed that you won't be changing between accounts or networks. Both things should be considered when creating a production Dapp.

- Our provider supports listening for both event: `accountsChanged` and `networkChanged`. 

- `accountsChanged` will trigger when the user switch between accounts on Metamask and return an array of the currently available accounts. Being that the case, we would want to `_stopPollingData()` and (re)`_initialize()` the application with the new address. 

- Let's go back to the `_connectWallet` function and attach the first event listener to `window.ethereum`:

```jsx{5-9}
  async _connectWallet() {

    // ...

    window.ethereum.on("accountsChanged", ([newAddress]) => {
      this._stopPollingData();
      
      this._initialize(newAddress);
    });
  }
```

- There might be the case when no accounts are available and `newAddress` evaluates to `undefined`. Eg: when the user removes the Dapp from the "Connected list of sites allowed access to your addresses" (Metamask > Settings > Connections). We can handle this by adding the following conditional: 

```jsx{8-10}
  async _connectWallet() {

    // ...

    window.ethereum.on("accountsChanged", ([newAddress]) => {
      this._stopPollingData();
      
      if (newAddress === undefined) {
        return this._resetState();
      }

      this._initialize(newAddress);
    });
  }
```

- `networkChanged` will return the new network id if it changes. Being that the case, we just want to `_stopPollingData` and `_resetState` of the Dapp:

```jsx{15-18}
  async _connectWallet() {

    // ...

    window.ethereum.on("accountsChanged", ([newAddress]) => {
      this._stopPollingData();
      
      if (newAddress === undefined) {
        return this._resetState();
      }

      this._initialize(newAddress);
    });

    window.ethereum.on("networkChanged", (networkId) => {
      this._stopPollingData();
      this._resetState();
    });
  }
```

- We can inform the user that the Dapp will work on certain networks. For this example, we'll use the Buidler EVM's network id. Here's a list of other [network ids](https://docs.metamask.io/guide/ethereum-provider.html#properties)

- We'll add this check right after enabling Ethereum and before initializing the Dapp:

```jsx{5-7}
  async _connectWallet() {

    const [selectedAddress] = await window.ethereum.enable();

    if (!this._checkNetwork()) {
      return;
    }

    this._initialize(selectedAddress);

    // ...
  }
```

- The Buidler EVM network id is `31337` and we'll store it in a constant

```jsx{4}
// ...

const ERROR_CODE_TX_REJECTED_BY_USER = 4001;
const BUIDLER_EVM_NETWORK_ID = '31337';

export class Dapp extends React.Component {
  // ...
}
```

- Finally, the `_checkNetwork` function is pretty straightforward, add it at the bottom of `Dapp.js`, below `resetState`

```jsx
  _checkNetwork() {
    if (window.ethereum.networkVersion === BUIDLER_EVM_NETWORK_ID) {
      return true;
    }
    
    this.setState({ 
      networkError: 'Please connect Metamask to Localhost:8545'
    });
    
    return false;
  }
```


- Done? Go to the browser and try the event listeners. 
