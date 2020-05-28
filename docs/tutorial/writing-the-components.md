# 9. Writing the components

- Done with the setup. Let's write a Dapp!

- In this section we're going to create all the presentational components of our Dapp.

- Before we start, a quick Token contract refresh:
  - There is a fixed total supply of tokens that can't be changed.
  - The entire supply is assigned to the address that deploys the contract.
  - Anyone can receive tokens.

- Out Dapp will implement three main features:
  - Allow users to connect to the Dapp via Metamask
  - Display the user's address and token balance
  - Allow the user to transfer tokens 

## Main component `App.js`
- This component will be in charge of the logic of the application. It'll have its own state and be the only one to know about Ethereum.

- For now we're just creating a starting layout. We'll extend it on the next section.

- Open `frontend/src/components/App.js` and replace its content with the code below.

- Take some time to read it, it's full of comments and should feel pretty straightforward if you are familiar with React. Don't worry about the imports yet. We'll go shortly through them. 

```jsx
import React from "react";

// All the logic of this dapp is contained in the Dapp component.
// These other components are just presentational ones: they don't have any
// logic. They just render HTML.
import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { Transfer } from "./Transfer";
import { TransactionErrorMessage } from "./TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./WaitingForTransactionMessage";
import { NoTokensMessage } from "./NoTokensMessage";

export default class App extends React.Component {
  constructor(props) {
    super(props);

    // We store multiple things in Dapp's state.
    // You don't need to follow this pattern, but it's an useful example.
    this.initialState = {
      // The info of the token (i.e. It's Name and symbol)
      tokenData: undefined,
      // The user's address and balance
      selectedAddress: undefined,
      balance: undefined,
      // The ID about transactions being sent, and any possible error with them
      txBeingSent: undefined,
      transactionError: undefined,
      networkError: undefined,
    };

    this.state = this.initialState;
  }

  render() {
    // Ethereum wallets inject the window.ethereum object. If it hasn't been
    // injected, we instruct the user to install MetaMask.
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }

    // The next thing we need to do, is to ask the user to connect their wallet.
    // When the wallet gets connected, we are going to save the users's address
    // in the component's state. So, if it hasn't been saved yet, we have
    // to show the ConnectWallet component.
    //
    // Note that we pass it a callback that is going to be called when the user
    // clicks a button. This callback just calls the _connectWallet method.
    if (!this.state.selectedAddress) {
      return (
        <ConnectWallet 
          connectWallet={() => this._connectWallet()} 
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    // If everything is loaded, we render the application.
    return (
      <div className="container p-4">
        <div className="row">
          <div className="col-12">
            <p>
              Welcome <b>{this.state.selectedAddress}</b>.
            </p>
          </div>
        </div>
        
        <hr />

        <div className="row">
          <div className="col-12">
            {/* 
              Sending a transaction isn't an immidiate action. You have to wait
              for it to be mined.
              If we are waiting for one, we show a message here.
            */}
            {this.state.txBeingSent && (
              <WaitingForTransactionMessage txHash={this.state.txBeingSent} />
            )}

            {/* 
              Sending a transaction can fail in multiple ways. 
              If that happened, we show a message here.
            */}
            {this.state.transactionError && (
              <TransactionErrorMessage
                message={this._getRpcErrorMessage(this.state.transactionError)}
                dismiss={() => this._dismissTransactionError()}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  componentWillUnmount() {
  }

  _connectWallet() {
  }

  // This method just clears part of the state.
  _dismissTransactionError() {
    this.setState({ transactionError: undefined });
  }

  // This method just clears part of the state.
  _dismissNetworkError() {
    this.setState({ networkError: undefined });
  }

  // This is an utility method that turns an RPC error into a human readable
  // message.
  _getRpcErrorMessage(error) {
    if (error.data) {
      return error.data.message;
    }

    return error.message;
  }

  // This method resets the state
  _resetState() {
    this.setState(this.initialState);
  }
}
```

## `index.js`

- Import bootstrap styles


```js{7}
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

import "bootstrap/dist/css/bootstrap.css";

// ...
```

## Other Components
- The rest of the components will be secondary. Create a new file for each of them and be sure to match the imports of `Apps.js`. Place them inside `frontend/src/components/`.

### `NoWalletDetected.js`

- Since our Dapp will allow the user to connect Metamask, we'll use this component to inform the user if the browser doesn't have Metamask installed.

```jsx
import React from "react";

export function NoWalletDetected() {
  return (
    <div className="container">
      <div className="row justify-content-md-center">
        <div className="col-6 p-4 text-center">
          <p>
            No Ethereum wallet was detected. <br />
            Please install{" "}
            <a
              href="http://metamask.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              MetaMask
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
```

### `ConnectWallet.js`

- For security reasons, Wallets aren't connected by default. 

- This component displays a button that will trigger a callback `connectWallet`.

- `networkError` and `dismiss` will be used for error displaying.

```jsx
import React from "react";

import { NetworkErrorMessage } from "./NetworkErrorMessage";

export function ConnectWallet({ connectWallet, networkError, dismiss }) {
  return (
    <div className="container">
      <div className="row justify-content-md-center">
        <div className="col-12 text-center">
          {/* Metamask network should be set to Localhost:8545. */}
          {networkError && (
            <NetworkErrorMessage 
              message={networkError} 
              dismiss={dismiss} 
            />
          )}
        </div>
        <div className="col-6 p-4 text-center">
          <p>Please connect to your wallet.</p>
          <button
            className="btn btn-warning"
            type="button"
            onClick={connectWallet}
          >
            Connect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
```


### `Loading.js`

- We'll be connecting to an Ethereum network performing async operations.

- This components just inform the user what's happening under the hood.

```jsx
import React from "react";

export function Loading() {
  return (
    <div
      style={{
        position: "fixed",
        zIndex: 2,
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(255, 255, 255, 0.5)",
      }}
    >
      <div
        style={{
          position: "absolute",
          zIndex: 3,
          top: "50%",
          left: "50%",
          width: "100px",
          height: "50px",
          marginLeft: "-50px",
          marginTop: " -25px",
          textAlign: "center",
        }}
      >
        <div className="spinner-border" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    </div>
  );
}
```

### `Transfer.js`

- This component will allow the user to transfer tokens through a friendly ui.

- We'll pass a callback `transferTokens`, that we'll be coding on the next section.

```jsx
import React from "react";

export function Transfer({ transferTokens, tokenSymbol }) {
  return (
    <div>
      <h4>Transfer</h4>
      <form
        onSubmit={(event) => {
          // This function just calls the transferTokens callback with the
          // form's data.
          event.preventDefault();

          const formData = new FormData(event.target);
          const to = formData.get("to");
          const amount = formData.get("amount");

          if (to && amount) {
            transferTokens(to, amount);
          }
        }}
      >
        <div className="form-group">
          <label>Amount of {tokenSymbol}</label>
          <input
            className="form-control"
            type="number"
            step="1"
            name="amount"
            placeholder="1"
            required
          />
        </div>
        <div className="form-group">
          <label>Recipient address</label>
          <input className="form-control" type="text" name="to" required />
        </div>
        <div className="form-group">
          <input className="btn btn-primary" type="submit" value="Transfer" />
        </div>
      </form>
    </div>
  );
}
```

### `TransactionErrorMessage`

- Sending a transaction is a complex operation:
  - The user can reject it
  - It can fail before reaching the Ethereum network (i.e. if the user
    doesn't have ETH for paying for the tx's gas)
  - It has to be mined, so it isn't immediately confirmed.
  - It can fail once mined.

- We'll use this component to display any potential error

```jsx
import React from "react";

export function TransactionErrorMessage({ message, dismiss }) {
  return (
    <div className="alert alert-danger" role="alert">
      Error sending transaction: {message.substring(0, 100)}
      <button
        type="button"
        className="close"
        data-dismiss="alert"
        aria-label="Close"
        onClick={dismiss}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
```

### `WaitingForTransactionMessage`

- In some testing networks, like Buidler EVM, transactions do mine immediately, but your Dapp should be prepared for other networks.

- This component will inform the user that a transaction is being processed

```jsx
import React from "react";

export function WaitingForTransactionMessage({ txHash }) {
  return (
    <div className="alert alert-info" role="alert">
      Waiting for transaction <strong>{txHash}</strong> to be mined
    </div>
  );
}
```

### `NoTokensMessage`

- A component to show the faucet task (and how to run it with the user's address).

```jsx
import React from "react";

export function NoTokensMessage({ selectedAddress }) {
  return (
    <>
      <p>You don't have tokens to transfer</p>
      <p>
        To get some tokens, open a temrinal in the root of the repository and run: 
        <br />
        <br />
        <code>npx buidler --network localhost faucet {selectedAddress}</code>
      </p>
    </>
  );
}
```



