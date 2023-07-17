import { assert } from "chai";
import ethers from "ethers";

import {
  ArgumentType,
  Artifact,
  ArtifactResolver,
  DeploymentResultContracts,
} from "../../src";
import { Deployer } from "../../src/new-api/internal/deployer";
import { AccountsState } from "../../src/new-api/internal/execution/execution-engine";
import { MemoryJournal } from "../../src/new-api/internal/journal/memory-journal";
import { ChainDispatcher } from "../../src/new-api/internal/types/chain-dispatcher";
import {
  OnchainState,
  OnchainStatuses,
} from "../../src/new-api/internal/types/execution-state";
import { DeploymentResult } from "../../src/new-api/types/deployer";
import { DeploymentLoader } from "../../src/new-api/types/deployment-loader";
import { Journal, JournalableMessage } from "../../src/new-api/types/journal";

export const exampleAccounts: string[] = [
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
];

export const initOnchainState: OnchainState = {
  status: OnchainStatuses.EXECUTE,
  currentExecution: null,
  from: null,
  nonce: null,
  txHash: null,
  actions: {},
};

export function assertInstanceOf<ObjectT>(
  obj: unknown,
  klass: new (...args: any[]) => ObjectT
): asserts obj is ObjectT {
  assert.instanceOf(obj, klass, `Not a valid instace of ${klass.name}`);
}

export function setupMockArtifactResolver(artifacts?: {
  [key: string]: Artifact;
}): ArtifactResolver {
  const fakeArtifact: Artifact = {
    abi: [],
    contractName: "",
    bytecode: "",
    linkReferences: {},
  };

  return {
    loadArtifact: async (contractName: string) => {
      if (artifacts === undefined) {
        return {
          ...fakeArtifact,
          contractName,
        };
      }

      const artifact = artifacts[contractName];

      if (artifact === undefined) {
        throw new Error(
          `No artifact set in test for that contractName ${contractName}`
        );
      }

      return artifacts[contractName];
    },
    getBuildInfo: async (_contractName: string) => {
      return { id: 12345 } as any;
    },
    resolvePath: async (contractName: string) => {
      return `${contractName}.json`;
    },
  };
}

export function setupMockDeploymentLoader(journal: Journal): DeploymentLoader {
  const storedArtifacts: { [key: string]: Artifact } = {};

  return {
    journal,
    recordDeployedAddress: async () => {},
    storeArtifact: async (futureId, artifact) => {
      const storedArtifactPath = `${futureId}.json`;

      storedArtifacts[storedArtifactPath] = artifact;

      return storedArtifactPath;
    },
    storeBuildInfo: async (buildInfo) => {
      return `build-info-${buildInfo.id}.json`;
    },
    loadArtifact: async (storedArtifactPath) => {
      const artifact = storedArtifacts[storedArtifactPath];

      if (artifact === undefined) {
        throw new Error(`Artifact not stored for ${storedArtifactPath}`);
      }

      return artifact;
    },
  };
}

export function setupDeployerWithMocks({
  journal = new MemoryJournal(),
  artifacts,
  transactionResponses,
  sendErrors,
  staticCall,
  getEventArgument,
}: {
  journal?: Journal;
  artifacts?: { [key: string]: Artifact };
  transactionResponses?: {
    [key: string]: {
      [key: number]: {
        blockNumber: number;
        confirmations: number;
        contractAddress?: string;
        transactionHash: string;
        logs?: {};
      };
    };
  };
  sendErrors?: { [key: string]: { [key: number]: () => void } };
  staticCall?: (
    contractAddress: string,
    abi: any[],
    functionName: string,
    args: ArgumentType[],
    from: string
  ) => Promise<any>;
  getEventArgument?: (
    eventName: string,
    argumentName: string,
    txToReadFrom: string,
    eventIndex: number,
    emitterAddress: string,
    abi: any[]
  ) => Promise<any>;
}): Deployer {
  const mockArtifactResolver = setupMockArtifactResolver(artifacts);
  const mockDeploymentLoader = setupMockDeploymentLoader(journal);
  const mockChainDispatcher = setupMockChainDispatcher({
    responses: transactionResponses,
    sendErrors,
    staticCall,
    getEventArgument,
  });

  return new Deployer({
    artifactResolver: mockArtifactResolver,
    deploymentLoader: mockDeploymentLoader,
    chainDispatcher: mockChainDispatcher,
  });
}

export async function accumulateMessages(
  journal: Journal
): Promise<JournalableMessage[]> {
  const messages: JournalableMessage[] = [];

  for await (const message of journal.read()) {
    messages.push(message);
  }

  return messages;
}

export function assertDeploymentFailure(
  result: DeploymentResult,
  expectedErrors: {
    [key: string]: Error;
  }
) {
  assert.isDefined(result);

  if (result.status !== "failure") {
    assert.fail("result expected to be failure");
  }

  assert.deepStrictEqual(result.errors, expectedErrors);
}

export function assertDeploymentSuccess(
  result: DeploymentResult,
  expectedContracts: DeploymentResultContracts
) {
  assert.isDefined(result);

  if (result.status !== "success") {
    assert.fail("result expected to be success");
  }

  assert.deepStrictEqual(result.contracts, expectedContracts);
}

export function setupMockChainDispatcher({
  responses = {},
  sendErrors = {},
  staticCall,
  getEventArgument,
}: {
  responses?: {
    [key: string]: {
      [key: number]: {
        blockNumber: number;
        confirmations: number;
        contractAddress?: string;
        transactionHash: string;
        logs?: {};
      };
    };
  };
  sendErrors?: { [key: string]: { [key: number]: () => void } };
  staticCall?: (
    contractAddress: string,
    abi: any[],
    functionName: string,
    args: ArgumentType[],
    from: string
  ) => Promise<any>;
  getEventArgument?: (
    _eventName: string,
    _argumentName: string,
    _txToReadFrom: string,
    _eventIndex: number,
    _emitterAddress: string,
    _abi: any[]
  ) => Promise<any>;
}): ChainDispatcher {
  return new MockChainDispatcher(
    responses,
    sendErrors,
    staticCall,
    getEventArgument
  );
}

export class MockChainDispatcher implements ChainDispatcher {
  private _accountsState: AccountsState;
  private _sentTxs: { [key: string]: ethers.providers.TransactionRequest };
  private _currentBlock: number;

  constructor(
    private _responses: {
      [key: string]: {
        [key: number]: {
          blockNumber: number;
          confirmations: number;
          contractAddress?: string;
          transactionHash: string;
          logs?: {};
        };
      };
    },
    private _sendErrors: { [key: string]: { [key: number]: () => void } },
    private _staticCall?: (
      contractAddress: string,
      abi: any[],
      functionName: string,
      args: ArgumentType[],
      from: string
    ) => Promise<any>,
    private _getEventArgument?: (
      _eventName: string,
      _argumentName: string,
      _txToReadFrom: string,
      _eventIndex: number,
      _emitterAddress: string,
      _abi: any[]
    ) => Promise<any>
  ) {
    this._accountsState = {};
    this._sentTxs = {};

    this._currentBlock = 1;
  }

  public getEventArgument(
    eventName: string,
    argumentName: string,
    txToReadFrom: string,
    eventIndex: number,
    emitterAddress: string,
    abi: any[]
  ): Promise<any> {
    if (this._getEventArgument === undefined) {
      throw new Error(
        "getEventArgument called but no `getEventArgument` mock provided"
      );
    }

    return this._getEventArgument(
      eventName,
      argumentName,
      txToReadFrom,
      eventIndex,
      emitterAddress,
      abi
    );
  }

  public async staticCallQuery(
    contractAddress: string,
    abi: any[],
    functionName: string,
    args: ArgumentType[],
    from: string
  ): Promise<any> {
    if (this._staticCall === undefined) {
      return "default-test-static-call-result";
    }

    return this._staticCall(contractAddress, abi, functionName, args, from);
  }

  public constructDeployTransaction(
    _byteCode: string,
    _abi: any[],
    _args: ArgumentType[],
    _value: bigint,
    _from: string
  ): Promise<ethers.providers.TransactionRequest> {
    const fakeTransaction = { _kind: "TEST-TRANSACTION" } as any;

    return fakeTransaction;
  }

  public constructCallTransaction(
    _contractAddress: string,
    _abi: any[],
    _functionName: string,
    _args: ArgumentType[],
    _value: bigint,
    _from: string
  ): Promise<ethers.ethers.providers.TransactionRequest> {
    const fakeTransaction = { _kind: "TEST-CALL-TRANSACTION" } as any;

    return fakeTransaction;
  }

  public async allocateNextNonceForAccount(address: string): Promise<number> {
    if (address in this._accountsState) {
      const nextNonce = this._accountsState[address] + 1;
      this._accountsState[address] = nextNonce;
      return nextNonce;
    }

    const onchainNonce = 0;
    this._accountsState[address] = onchainNonce;

    return onchainNonce;
  }

  public async sendTx(
    tx: ethers.providers.TransactionRequest,
    from: string
  ): Promise<string> {
    if (
      from in this._sendErrors &&
      Number(tx.nonce) in this._sendErrors[from]
    ) {
      this._sendErrors[from][Number(tx.nonce)]();
    }

    const hash = `${from}--${tx.nonce?.toString() ?? "no-nonce"}`;
    this._sentTxs[hash] = tx;

    return hash;
  }

  public async getTransactionReceipt(
    txHash: string
  ): Promise<ethers.providers.TransactionReceipt> {
    const [from, nonce] = txHash.split("--");

    const addressEntries = this._responses[from];

    if (addressEntries === undefined) {
      throw new Error(`No transaction responses recorded for address ${from}`);
    }

    const response = addressEntries[parseInt(nonce, 10)];

    if (response === undefined) {
      throw new Error(
        `No transaction responses recorded for nonce ${from}/${nonce}`
      );
    }

    return response as any;
  }

  public async getTransaction(
    txHash: string
  ): Promise<ethers.providers.TransactionResponse | null | undefined> {
    const [from, nonce] = txHash.split("--");

    const addressEntries = this._responses[from];

    if (addressEntries === undefined) {
      throw new Error(`No transaction responses recorded for address ${from}`);
    }

    const response = addressEntries[parseInt(nonce, 10)];

    if (response === undefined) {
      throw new Error(
        `No transaction responses recorded for nonce ${from}/${nonce}`
      );
    }

    return { _kind: "fake-transaction", ...response } as any;
  }

  public async getCurrentBlock(): Promise<{ number: number; hash: string }> {
    const number = this._currentBlock++;

    return { number, hash: `test-hash-${number}` };
  }

  public async getPendingTransactionCount(_address: string): Promise<number> {
    return 0;
  }

  public async getLatestTransactionCount(_address: string): Promise<number> {
    return 0;
  }
}
