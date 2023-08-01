import { ExecutionState } from "../execution/types";
import { isOnChainResultMessage } from "../journal/type-guards";
import {
  ExecutionSuccess,
  OnchainInteractionMessage,
  OnchainResultMessage,
  TransactionMessage,
} from "../journal/types";
export class ExecutionStategyCycler {
  /**
   * Given a execution strategy and history of on chain transactions
   * bring the execution strategy up to the latest
   */
  public static async fastForward(
    exState: ExecutionState,
    strategyInst: AsyncGenerator<
      OnchainInteractionMessage,
      ExecutionSuccess | OnchainInteractionMessage,
      OnchainResultMessage | null
    >
  ): Promise<{
    strategyInst: AsyncGenerator<
      OnchainInteractionMessage,
      ExecutionSuccess | OnchainInteractionMessage,
      OnchainResultMessage | null
    >;
    lastMessage: TransactionMessage | ExecutionSuccess | null;
  }> {
    // On the first run the responsibilite for initializing the
    // execution strategy is the state machine
    if (exState.history.length === 0) {
      return { strategyInst, lastMessage: null };
    }

    // As there are messages, do an initialization first
    let lastMessage: TransactionMessage | ExecutionSuccess = (
      await strategyInst.next(null)
    ).value;

    for (const transactionMessage of exState.history) {
      lastMessage = transactionMessage;

      if (isOnChainResultMessage(transactionMessage)) {
        lastMessage = (await strategyInst.next(transactionMessage)).value;
      }
    }

    return { strategyInst, lastMessage };
  }
}
