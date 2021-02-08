import { ethers } from "ethers";

// This is taken from @ethersproject/abstract-signer package.
// EIP-712 Typed Data
// See: https://eips.ethereum.org/EIPS/eip-712

export type SignTypedDataParams = Parameters<
  ethers.providers.JsonRpcSigner["_signTypedData"]
>;

export type TypedDataDomain = SignTypedDataParams[0];
export type TypedDataFields = SignTypedDataParams[1];

export class SignerWithAddress extends ethers.Signer {
  public static async create(signer: ethers.providers.JsonRpcSigner) {
    return new SignerWithAddress(await signer.getAddress(), signer);
  }

  private constructor(
    public readonly address: string,
    private readonly _signer: ethers.providers.JsonRpcSigner
  ) {
    super();
    (this as any).provider = _signer.provider;
  }

  public async getAddress(): Promise<string> {
    return this.address;
  }

  public signMessage(message: string | ethers.utils.Bytes): Promise<string> {
    return this._signer.signMessage(message);
  }

  public signTransaction(
    transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>
  ): Promise<string> {
    return this._signer.signTransaction(transaction);
  }

  public sendTransaction(
    transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>
  ): Promise<ethers.providers.TransactionResponse> {
    return this._signer.sendTransaction(transaction);
  }

  public connect(provider: ethers.providers.Provider): SignerWithAddress {
    return new SignerWithAddress(this.address, this._signer.connect(provider));
  }

  public _signTypedData(
    domain: TypedDataDomain,
    types: TypedDataFields,
    value: Record<string, any>
  ): Promise<string> {
    return this._signer._signTypedData(domain, types, value);
  }

  public toJSON() {
    return `<SignerWithAddress ${this.address}>`;
  }
}
