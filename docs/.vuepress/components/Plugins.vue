<template>
<div class="content">
  <h1>Plugins</h1>
  <p>Plugins are the backbone of Buidler. Buidler's plugins and built-in tasks are built using the same API that you use in your Buidler configuration!</p>
  <p>Extend Buidler's functionality with the plugins below.</p>
  <!-- Check out the [Using Plugins Guide]() to learn more.</p> -->
  <div class="plugins">
    <div class="plugin" v-for="plugin in plugins">
      <div>
        <span class="name"><a :href="plugin.url">{{ plugin.name }}</a></span>
        <span class="version">{{ plugin.version }}</span>
      </div>
      <p class="description">{{ plugin.description }}</p>
      <div class="tags">
        <div v-for="tag in plugin.tags">{{ tag }}</div>
      </div>
    </div>
  </div>
</div>
</template>

<script>


let plugins = [
  {
    name: "@nomiclabs/buidler-truffle4",
    version: "1.0.0-beta.9",
    url: "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-truffle4",
    description: "Integration with TruffleContract from Truffle 4",
    tags: ["Truffle", "Testing"]
  }, {
    name: "@nomiclabs/buidler-truffle5",
    version: "1.0.0-beta.9",
    url: "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-truffle5",
    description: "Integration with TruffleContract from Truffle 5",
    tags: ["Truffle", "Testing"],
  }, {
    name: "@nomiclabs/buidler-web3",
    version: "1.0.0-beta.9",
    url: "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3",
    description: "Injects Web3 1.x into the Buidler Runtime Environment",
    tags: ["Web3.js", "Testing", "Tasks", "Scripts"],
  }, {
    name: "@nomiclabs/buidler-web3-legacy",
    version: "1.0.0-beta.9",
    url: "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3-legacy",
    description: "Injects Web3 0.20.x into the Buidler Runtime Environment",
    tags: ["Web3.js", "Legacy", "Testing", "Tasks", "Scripts"],
  }, {
    name: "@nomiclabs/buidler-ethers",
    version: "1.0.0-beta.9",
    url: "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-ethers",
    description: "Injects ethers.js into the Buidler Runtime Environment",
    tags: ["Ethers.js", "Testing", "Tasks", "Scripts"],
  }, {
    name: "@nomiclabs/buidler-etherscan",
    version: "1.0.0-beta.9",
    url: "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-etherscan",
    description: "Automatically verify contracts on Etherscan",
    tags: ["Etherscan", "Verification"],
  }, {
    name: "@nomiclabs/buidler-solpp",
    version: "1.0.0-beta.9",
    url: "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-solpp",
    description: "Automatically run the solpp preprocessor before each compilation",
    tags: ["Solpp", "Preprocessor"],
  }, {
    name: "@nomiclabs/buidler-solhint",
    version: "1.0.0-beta.9",
    url: "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-solhint",
    description: "Easily run solhint to lint your Solidity code",
    tags: ["Solhint", "Linter"]
  }, {
    name: "@nomiclabs/buidler-vyper",
    version: "1.0.0-beta.9",
    url: "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-vyper",
    description: "Adds support to compile Vyper smart contracts",
    tags: ["Vyper", "Compiler"]
  },
  {
    name: "buidler-gas-reporter",
    version: "0.1.2",
    url: "https://github.com/cgewecke/buidler-gas-reporter",
    description: "Gas usage per unit test. Average gas usage per method. A mocha reporter.",
    tags: ["Testing", "Gas"]
  }
];

export default {
  data() {
    return {"plugins": plugins};
  }
}

</script>
