# 12. Error Handling

The application in the previous section works well if everything is working correctly. However, if there is any error it just shows that JSON that users
won't understand. To fix this, we identify all the ways that the application can go wrong and give informative error messages for them.

In general, error conditions come from two sources in a simple dapp:

1. Communication errors (for example, being unable to connect to the blockchain)
1. User mistakes (For example, an attempt to transfer more tokens than the user has)

The best way to create a user friendly application is to simulate all of those error conditions and see what errors they produce:

| Error condition                                   | error fields    |
|---------------------------------------------------|-----------------------------|
| Connected to the wrong network                    | Varies (depends on network)                                                     |
| Invalid nonce     |  message includes "Invalid nonce" |
| Attempt to do anything prior to permitting access in MetaMask | message = "Permissions request already pending; please wait" |
| User rejects the connection between MetaMask and application | message = "User rejected the request." |
| User rejects the specific transaction | message = "MetaMask Tx Signature: User denied transaction signature." |
| The Hardhat blockchain isn't running | message includes "Response has no error or result for request" |
| Not enough tokens for operation                   | data.message = "VM Exception while processing transaction: revert Not enough tokens" |
| Attempt to get an initial stake after it was taken | data.message = "VM Exception while processing transaction: revert Initial stake already taken" |
| Attempt to transfer without a destination address | reason = "network does not support ENS" |
| Attempt to transfer an invalid number of tokens | code = "INVALID_ARGUMENT" and argument = "value" or "amount" |

Then, add an `explainError` function to the component:

```js
  // Create informative error messages
  explainError(err) {

    var msg = null

    console.log(err)

    if (err.message.match("Invalid nonce"))
      msg = "Invalid nonce, specify the nonce in MetaMask"

    if (err.message.match("Response has no error or result for request"))
      msg = "Make sure the Hardhat blockchain is running"

    if (err.message === "Permissions request already pending; please wait")
      msg = "You have to authorize the app in MetaMask first"

    if (err.message === "User rejected the request.")
      msg = "You told MetaMask not to trust me"

    if (err.message === "MetaMask Tx Signature: User denied transaction signature.")
      msg = "You need to approve the transaction in MetaMask"
    
    if (err.data &&
        err.data.message ===
        "VM Exception while processing transaction: revert Not enough tokens")
     msg = "You need to have enough tokens to do that"

    if (err.data &&
        err.data.message ===
        "VM Exception while processing transaction: revert Initial stake already taken")
     msg = "You're too late, the initial stake is already taken"    
     
    if (err.reason === "network does not support ENS")
      msg = "Specify the destination address"

    if (err.code === "INVALID_ARGUMENT" &&
        (err.argument === "value" || err.argument === "amount"))
      msg = "This value is not valid, try a positive number next time"
      
    if (msg) {
      this.setState({error:
        <>
          <h4>{msg}</h4>
        </>
      })
    } else {
      // If we got here, we don't know what caused the error.
      this.setState({error:
        <>
          <h4>Unknown error</h4>
          {JSON.stringify(err)}
        </>
      })
    }   // if(msg) else      
  } // explainError      
```

Call this function every place you set the `error` state variable, for example:

```js
  async getInitialStake() {
    try {
      await ethDispObj.state.tokenContract.getInitialStake()
    } catch (err) {
      ethDispObj.explainError(err)
    }
  }  // getInitialStake
```

At this point you should be able to write contracts in Hardhat, run unit tests to ensure those contracts are valid, and write a user interface for users to use them.
