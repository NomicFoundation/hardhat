async function main() {
  const transactionIdToConfirm = 0;
  const multisigAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const artifact = await hre.artifacts.readArtifact("Multisig");
  const multisigInstance = await hre.ethers.getContractAt(
    artifact.abi,
    multisigAddress
  );
  await multisigInstance.confirmTransaction(transactionIdToConfirm);

  // eslint-disable-next-line no-console
  console.log(`Confirmed transaction for execution `);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
