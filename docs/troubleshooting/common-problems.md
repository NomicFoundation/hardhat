# Common problems

This section describes common problems with working with Hardhat and how to solve them.

## Out of memory errors when compiling large projects

If your project has lots of smart contracts, compiling them may require more memory than what Node allows by default and crash.

If you are experiencing this problem, you can use Hardhat's `--max-memory` argument:

```
npx hardhat --max-memory 4096 compile
```

If you find yourself using this all the time, you can set it with an environment variable in your `.bashrc`: `export HARDHAT_MAX_MEMORY=4096`.


## Error: The chain ID does not match the chain ID of Common

This can be casued when forking a network and the chain ID is configured incorrectly. If you set chainID = <ID of the network your forking> it should work. See  https://chainlist.org/ for a list of network IDs.
  
See example below:
```
hardhat: {
  forking: {
    url: env.ETHEREUM_RPC_URL,
    blockNumber: <your choice>
  },
  chainId: 1, //ETH mainnet
}
```
