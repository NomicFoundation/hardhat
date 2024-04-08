export function expect(fn: any) {
  // TODO: function or value

  return {
    to: {
      async changeEtherBalance(address: any, amount: bigint) {
        const hre = await import("hardhat");

        const publicClient = await hre.default.viem.getPublicClient();

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
