import { AccessListEIP2930TxData, TxData } from "@ethereumjs/tx";
import { FeeMarketEIP1559TxData } from "@ethereumjs/tx/dist/types";
import { RpcTransaction } from "../../../core/jsonrpc/types/output/transaction";
export declare function rpcToTxData(rpcTransaction: RpcTransaction): TxData | AccessListEIP2930TxData | FeeMarketEIP1559TxData;
//# sourceMappingURL=rpcToTxData.d.ts.map