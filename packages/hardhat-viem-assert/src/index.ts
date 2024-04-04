export function expect(fn: any) {
  // TODO: function or value

  return {
    to: {
      async changeEtherBalance(
        publicClient: any,
        address: any,
        amount: bigint
      ) {
        const balanceBefore = await publicClient.getBalance({
          address,
        });

        await fn();

        const balanceAfter = await publicClient.getBalance({
          address,
        });

        if (balanceBefore - amount !== balanceAfter) {
          throw new Error(
            `Expected ${balanceBefore - amount} to equal ${balanceAfter}`
          );
        }

        console.log(`a:${balanceBefore}\nb:${balanceAfter}`);
      },
    },
  };
}
