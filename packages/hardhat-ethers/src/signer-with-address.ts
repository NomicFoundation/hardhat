import { ethers } from "ethers";

export class SignerWithAddress extends ethers.Signer {
  public static async create(signer: ethers.Signer) {
    return new SignerWithAddress(await signer.getAddress(), signer);
  }

  private constructor(
    public readonly address: string,
    private readonly _signer: ethers.Signer
  ) {
    super();
    (this as any).provider = _signer.provider;
  }

  public async getAddress(): Promise<string> {
    return this.address;
  }

  public signMessage(message: ethers.utils.Arrayish): Promise<string> {
    return this._signer.signMessage(message);
  }

  public sendTransaction(
    transaction: ethers.providers.TransactionRequest
  ): Promise<ethers.providers.TransactionResponse> {
    return this._signer.sendTransaction(transaction);
  }
}
