
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




function initProvider(): void {
  window.ethers = ethers;
  if (window.ethereum) {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    window.provider = provider;
    window.signer = provider.getSigner();
    window.signer.getAddress().then((address) => {
      window.address = address;
    });

  }
}

export const App = () => {
  initProvider();
  return (<>
  </>);
};
