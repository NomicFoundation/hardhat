# 11. Token User Interface

Now that everything else is configured, replace `src/App.js` with this file:

::: note
Putting everything in a single component, as here, is not the optimal way to use React. The only reason I did it here is to minimize the dependence on React
for people who use other frameworks.
:::

```js
import React from 'react'
import './App.css'
import { ethers } from "ethers"
import TokenArtifact from "./contracts/Token.json"
import contractAddress from "./contracts/contract-address.json"


class EthereumDisplay extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      network: "???",
      ourAddr: "???",
      tokenAddr: contractAddress.Token,
      etherBalance: 0,   // in Wei
      tokenBalance: 0,
      transferToField: "",
      transferToAddr: "",
      transferAmt: 0
    } // this.state

  }   // constructor



  // Process a NewBalance event
  processEvent = async (addr, balance) => {
    this.setState({tokenBalance: balance.toNumber())})
  }     // processEvent  
  

  // This function is called after the component is rendered.
  componentDidMount = async () => {
    await window.ethereum.enable()
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    const net = await provider.getNetwork()

    const ourAddr = await signer.getAddress()
    const tokenContract = new ethers.Contract(this.state.tokenAddr, TokenArtifact.abi, signer)

    const etherBalance = ethers.utils.formatEther(await provider.getBalance(ourAddr))
    const tokenBalance = (await tokenContract.balanceOf(ourAddr)).toNumber()

    tokenContract.on(
        tokenContract.filters.NewBalance(ourAddr),
        this.processEvent
    )

    this.setState({
        provider: provider,
        signer:   signer,
        tokenContract: tokenContract,
        ourAddr:  ourAddr,
        etherBalance: etherBalance,
        tokenBalance: tokenBalance,
        network: `${net.name} (${net.chainId})`
    })   // this.setState
  }   // componentDidMount


  // When the transferTo field is changed, accept the change. If the new value is a valid
  // address, put the valid address in the state.
  handleTTFChange = evt => {
    var toAddr;
    try {
       toAddr = ethers.utils.getAddress(this.state.transferToField)

      this.setState({
        transferToField: evt.target.value,
        transferToAddr:  toAddr})
    } catch (err) {
      this.setState({
        transferToField: evt.target.value,
        transferToAddr:  ""})
    }
  }


  handleTAChange = evt => {
    this.setState({transferAmt: evt.target.value})
  }


  getInitialStake = () => {
    this.state.tokenContract.getInitialStake()
  }  // getInitialStake


  burnToken = () => {
    this.state.tokenContract.transfer("0000000000000000000000000000000000000000", 1)
  }


  transferToken = () => {
    this.state.tokenContract.transfer(this.state.transferToAddr, this.state.transferAmt)
  }  // transferToken





  render = () => {
     // All the returned HTML needs to be packed in a single tag
     return (
         <>
         <h2>Ethereum Status</h2>
         <table className="table table-bordered table-striped">
           <thead><tr>
              <th>Parameter</th>
              <th>Value</th>
           </tr></thead>
           <tbody>
              <tr><td>Network</td><td>{this.state.network}</td></tr>
              <tr><td>User Address</td><td>{this.state.ourAddr}</td></tr>
              <tr><td>Token Contract Address</td><td>{this.state.tokenAddr}</td></tr>
              <tr><td>Ether Balance</td><td>{this.state.etherBalance}</td></tr>
              <tr><td>Token Balance</td><td>{this.state.tokenBalance}</td></tr>
              <tr><td>Transfer to:</td><td>
                  <input type="text" value={this.state.transferToField}
                      onChange={this.handleTTFChange} />
              </td></tr>
              <tr><td>Transfer amount:</td><td>
                  <input type="number" value={this.state.transferAmt}
                      onChange={this.handleTAChange} />
              </td></tr>
           </tbody>
         </table>
         <button className="btn btn-primary mr-2" onClick={this.getInitialStake}>
            Initial Stake
         </button>
         <button className="btn btn-success mr-2"
                 onClick={this.transferToken}>
            Transfer {this.state.transferAmt} tokens to {this.state.transferToAddr}
         </button>
         <button className="btn btn-danger" onClick={this.burnToken}>
            Burn a Token
         </button>
         </>
     )   // return
  }      // render


}        // class EthereumDisplay



function App() {
  return (
    <div className="App">
      <EthereumDisplay />
    </div>
  );
}

export default App;
```

If you have both your React and your Buidler EVM running, after you save this file you should be able to browse to http://localhost:3000, 
see the application, request an initial state, and so on.

## Detailed explanation

To first step is to `import` everything we'll need. These import statements are executed on the server side, so they can be used for
both files in the `frontend/src` directory and Node.js modules imported by npm.

```js
import React from 'react'
import './App.css'
import { ethers } from "ethers"
import TokenArtifact from "./contracts/Token.json"
import contractAddress from "./contracts/contract-address.json"
```

React components are implemented as [JavaScript classes](https://www.w3schools.com/js/js_classes.asp) that inherit from `React.Component`.

```js
class EthereumDisplay extends React.Component {
  constructor(props) {
    super(props)
```

All the variables that make up the state of the component are supposed to be stored inside a `state` associative array. In the
constructor you just assign values to this array.

```
    this.state = {
      network: "???",
      ourAddr: "???",
      tokenAddr: contractAddress.Token,
      etherBalance: 0,   // in Wei
      tokenBalance: 0,
      transferToField: "",
      transferToAddr: "",
      transferAmt: 0
    } // this.state

  }   // constructor
  
```

This function is called when the contract emits a `NewBalance` event for the user's address (we see how it is registered
later). It receives as parameters the two values of that event, the address and its new balance.

```js
  // Process a NewBalance event
  processEvent = async (addr, balance) => {
  
```  

The method `this.setState` is used to update the state once component has been mounted. In addition to changing `this.state` it 
triggers any needed updated and reruns `render`.

The balance is provided in a type called [BigNumber](https://docs.ethers.io/v5/api/utils/bignumber/). 

```js  
    this.setState({tokenBalance: balance.toNumber())})
  }     // processEvent
```


```js
  // This function is called after the component is rendered.
  componentDidMount = async () => {
    await window.ethereum.enable()
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    const net = await provider.getNetwork()

    const ourAddr = await signer.getAddress()
    const tokenContract = new ethers.Contract(this.state.tokenAddr, TokenArtifact.abi, signer)

    const etherBalance = ethers.utils.formatEther(await provider.getBalance(ourAddr))
    const tokenBalance = (await tokenContract.balanceOf(ourAddr)).toNumber()

    tokenContract.on(
        tokenContract.filters.NewBalance(ourAddr),
        this.processEvent
    )

    this.setState({
        provider: provider,
        signer:   signer,
        tokenContract: tokenContract,
        ourAddr:  ourAddr,
        etherBalance: etherBalance,
        tokenBalance: tokenBalance,
        network: `${net.name} (${net.chainId})`
    })   // this.setState
  }   // componentDidMount


  // When the transferTo field is changed, accept the change. If the new value is a valid
  // address, put the valid address in the state.
  handleTTFChange = evt => {
    var toAddr;
    try {
       toAddr = ethers.utils.getAddress(this.state.transferToField)

      this.setState({
        transferToField: evt.target.value,
        transferToAddr:  toAddr})
    } catch (err) {
      this.setState({
        transferToField: evt.target.value,
        transferToAddr:  ""})
    }
  }


  handleTAChange = evt => {
    this.setState({transferAmt: evt.target.value})
  }


  getInitialStake = () => {
    this.state.tokenContract.getInitialStake()
  }  // getInitialStake


  burnToken = () => {
    this.state.tokenContract.transfer("0000000000000000000000000000000000000000", 1)
  }


  transferToken = () => {
    this.state.tokenContract.transfer(this.state.transferToAddr, this.state.transferAmt)
  }  // transferToken





  render = () => {
     // All the returned HTML needs to be packed in a single tag
     return (
         <>
         <h2>Ethereum Status</h2>
         <table className="table table-bordered table-striped">
           <thead><tr>
              <th>Parameter</th>
              <th>Value</th>
           </tr></thead>
           <tbody>
              <tr><td>Network</td><td>{this.state.network}</td></tr>
              <tr><td>User Address</td><td>{this.state.ourAddr}</td></tr>
              <tr><td>Token Contract Address</td><td>{this.state.tokenAddr}</td></tr>
              <tr><td>Ether Balance</td><td>{this.state.etherBalance}</td></tr>
              <tr><td>Token Balance</td><td>{this.state.tokenBalance}</td></tr>
              <tr><td>Transfer to:</td><td>
                  <input type="text" value={this.state.transferToField}
                      onChange={this.handleTTFChange} />
              </td></tr>
              <tr><td>Transfer amount:</td><td>
                  <input type="number" value={this.state.transferAmt}
                      onChange={this.handleTAChange} />
              </td></tr>
           </tbody>
         </table>
         <button className="btn btn-primary mr-2" onClick={this.getInitialStake}>
            Initial Stake
         </button>
         <button className="btn btn-success mr-2"
                 onClick={this.transferToken}>
            Transfer {this.state.transferAmt} tokens to {this.state.transferToAddr}
         </button>
         <button className="btn btn-danger" onClick={this.burnToken}>
            Burn a Token
         </button>
         </>
     )   // return
  }      // render


}        // class EthereumDisplay



function App() {
  return (
    <div className="App">
      <EthereumDisplay />
    </div>
  );
}

export default App;
```
