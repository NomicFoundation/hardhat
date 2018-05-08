console.log("Sool env's web3 provider's host:", web3.currentProvider.host);
pweb3.eth.getAccounts().then(accounts => {
  accounts.map(addr => {
    web3.eth.getBalance(addr, (err, balance) => {
      if (err) {
        console.error(err);
        return;
      }

      console.log(`${addr}: ${balance.toString(10)}`);
    });
  });
});
