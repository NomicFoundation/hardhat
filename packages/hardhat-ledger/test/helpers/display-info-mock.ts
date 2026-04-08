/**
 * Mock implementation of hardhat's `context.interruptions.displayMessage`.
 * The function `fn` serves as the actual mock, while the other properties are used to verify
 * that the expected number of calls and messages occur.
 */

export const mockedDisplayInfo: {
  totCalls: number;
  messages: string[];
  fn: (interruptor: string, message: string) => Promise<void>;
  clear: () => void;
} = {
  totCalls: 0,
  messages: [],
  async fn(_interruptor: string, message: string) {
    mockedDisplayInfo.totCalls++;
    mockedDisplayInfo.messages.push(message);
  },
  clear(): void {
    mockedDisplayInfo.totCalls = 0;
    mockedDisplayInfo.messages = [];
  },
};
