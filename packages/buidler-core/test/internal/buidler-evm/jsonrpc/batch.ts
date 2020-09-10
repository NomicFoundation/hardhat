import { assert } from "chai";
import sinon, { SinonStub } from "sinon";

import {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../src/internal/util/jsonrpc";

type BatchJsonRpcRequest = JsonRpcRequest[];
type BatchJsonRpcResponse = JsonRpcResponse[];

type ResolveFunction = (value?: unknown) => void;
type RejectFunction = (error?: any) => void;
type DeferredRequest = [JsonRpcRequest, ResolveFunction, RejectFunction];

interface HttpRequestService {
  send(request: BatchJsonRpcRequest): Promise<BatchJsonRpcResponse>;
}

class JsonRpcRequestBatcher {
  private _deferredRequests: DeferredRequest[] = [];
  private _nextRequestId = 1;

  constructor(
    private readonly _httpService: HttpRequestService,
    private readonly _batchingTime: number
  ) {}

  public send(method: string, params?: any[]): Promise<any> {
    const request = this._getJsonRpcRequest(method, params);
    return this._deferSend(request);
  }

  private _deferSend(request: JsonRpcRequest) {
    return new Promise((resolve, reject) => {
      this._deferredRequests.push([request, resolve, reject]);

      if (this._deferredRequests.length === 1) {
        setTimeout(this._performSend.bind(this), this._batchingTime);
      }
    });
  }

  private async _performSend() {
    const requests = this._deferredRequests.map((req) => req[0]);
    const resolveFunctions = this._deferredRequests.map((req) => req[1]);
    const rejectFunctions = this._deferredRequests.map((req) => req[2]);
    this._deferredRequests = [];
    try {
      const responses = await this._httpService.send(requests);
      for (let i = 0; i < resolveFunctions.length; i++) {
        resolveFunctions[i](responses[i]);
      }
    } catch (e) {
      for (const reject of rejectFunctions) {
        reject(e);
      }
    }
  }

  private _getJsonRpcRequest(
    method: string,
    params: any[] = []
  ): JsonRpcRequest {
    return {
      jsonrpc: "2.0",
      method,
      params,
      id: this._nextRequestId++,
    };
  }
}

function PromiseAllWithDelay<AllT>(
  values: Array<() => AllT | PromiseLike<AllT>>,
  delayFunction: () => void
): Promise<AllT[]> {
  return new Promise((resolve, reject) => {
    const results: AllT[] = [];
    let completed = 0;

    values.forEach((value, index) => {
      Promise.resolve(value())
        .then((result) => {
          results[index] = result;
          completed += 1;

          if (completed === values.length) {
            resolve(results);
          }
        })
        .catch((err) => reject(err));
      delayFunction();
    });
  });
}

describe("JsonRpcRequestBatcher", () => {
  const batchingTime = 20;
  let batcher: JsonRpcRequestBatcher;
  let sendMock: SinonStub;

  beforeEach(() => {
    const httpService: HttpRequestService = {
      send: (...args) => sendMock(args),
    };
    batcher = new JsonRpcRequestBatcher(httpService, batchingTime);
  });

  describe("send", () => {
    it("makes a single http request for a single call", async () => {
      sendMock = sinon.mock().resolves(["0xdeadbeef"]);
      const blockNumber = await batcher.send("eth_blockNumber", []);
      assert.equal(sendMock.callCount, 1);
      assert.equal(blockNumber, "0xdeadbeef");
    });

    it("makes a single http request for two consecutive calls", async () => {
      sendMock = sinon.mock().resolves(["0x1", "0x2"]);
      const [blockOne, blockTwo] = await Promise.all([
        batcher.send("eth_blockNumber"),
        batcher.send("eth_blockNumber"),
      ]);
      assert.equal(sendMock.callCount, 1);
      assert.equal(blockOne, "0x1");
      assert.equal(blockTwo, "0x2");
    });

    it("makes two http requests for two calls separated by a delay larger than batching time", async () => {
      const clock = sinon.useFakeTimers({ shouldAdvanceTime: true });
      sendMock = sinon
        .stub()
        .onFirstCall()
        .resolves(["0x1"])
        .onSecondCall()
        .resolves(["0x2"]);

      const [blockOne, blockTwo] = await PromiseAllWithDelay(
        [
          () => batcher.send("eth_blockNumber"),
          () => batcher.send("eth_blockNumber"),
        ],
        () => clock.tick(batchingTime * 2)
      );
      assert.equal(sendMock.callCount, 2);
      assert.equal(blockOne, "0x1");
      assert.equal(blockTwo, "0x2");

      clock.restore();
    });
  });
});
