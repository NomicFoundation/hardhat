console.log("Sool env's web3 provider's host:", web3.currentProvider.host);

web3.eth.getAccounts((err, accounts) => {
  accounts.map(addr => {
    web3.eth.getBalance(addr, (err2, balance) => {
      console.log(`${addr}: ${balance.toString(10)}`);
    });
  });
});

getContract("Contract").then(console.log);
