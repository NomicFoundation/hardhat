export function buildContractUrl(
  browserURL: string,
  contractAddress: string
): string {
  const normalizedBrowserURL = browserURL.trim().replace(/\/$/, "");

  return `${normalizedBrowserURL}/address/${contractAddress}#code`;
}
