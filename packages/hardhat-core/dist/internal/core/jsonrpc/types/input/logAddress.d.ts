/// <reference types="node" />
import * as t from "io-ts";
export declare const rpcLogAddress: t.UnionC<[t.Type<Buffer, Buffer, unknown>, t.ArrayC<t.Type<Buffer, Buffer, unknown>>]>;
export declare type RpcLogAddress = t.TypeOf<typeof rpcLogAddress>;
export declare const optionalRpcLogAddress: t.Type<Buffer | Buffer[] | undefined, Buffer | Buffer[] | undefined, unknown>;
export declare type OptionalRpcLogAddress = t.TypeOf<typeof optionalRpcLogAddress>;
//# sourceMappingURL=logAddress.d.ts.map