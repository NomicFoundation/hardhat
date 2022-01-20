
import { ExternalProvider, Web3Provider } from "@ethersproject/providers";
import { Signer, ethers } from "ethers";

declare global {
  interface Window {
    ethereum: ExternalProvider;
    provider: Web3Provider;
    signer: Signer;
    ethers: object;
    address: string;
  }
}


async function bindSigner(): Promise<void> {
  window.signer = await window.provider.getSigner();
  window.address = await window.signer.getAddress();
}

function bindProviderHooks(): void {
  window.provider.on('accountsChanged', async function(accounts){
      await bindSigner();
  })
}

function initProvider(): void {
  window.ethers = ethers;
  if (window.ethereum) {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    window.provider = provider;
    bindSigner();
    bindProviderHooks();

  }
}

export const App = () => {
  initProvider();
  return <>
  </>;
};
