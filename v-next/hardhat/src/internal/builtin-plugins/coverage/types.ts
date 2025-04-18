import type { CoverageManager } from "../../../types/coverage.js";
import type { ChainType, NetworkConnection } from "../../../types/network.js";

export interface InternalCoverageManager extends CoverageManager {
  handleNewConnection<ChainTypeT extends ChainType | string>(
    connection: NetworkConnection<ChainTypeT>,
  ): Promise<void>;
  handleCloseConnection<ChainTypeT extends ChainType | string>(
    connection: NetworkConnection<ChainTypeT>,
  ): Promise<void>;
}
