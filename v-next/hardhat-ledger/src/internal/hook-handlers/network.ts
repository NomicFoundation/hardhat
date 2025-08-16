import type { NetworkHookHandler } from "hardhat/types/hooks";
import type { NetworkConnection } from "hardhat/types/network";
import { DMKManager } from "../dmk-manager.js";
import { LedgerProvider } from "../ledger-provider.js";
import type { LedgerOptions } from "../../types.js";

const networkHookHandler: NetworkHookHandler = {
  newConnection: async ({ connection, networkConfig }, _context) => {
    if (!networkConfig.ledgerAccounts || networkConfig.ledgerAccounts.length === 0) {
      return { connection };
    }

    const ledgerOptions = networkConfig.ledgerOptions as LedgerOptions | undefined;

    const dmkManager = new DMKManager(ledgerOptions?.dmkOptions);
    
    const ledgerProvider = new LedgerProvider(
      connection.provider,
      dmkManager,
      {
        accounts: networkConfig.ledgerAccounts,
        derivationFunction: ledgerOptions?.derivationFunction || 
          ((index: number) => `m/44'/60'/0'/0/${index}`),
      }
    );

    await ledgerProvider.initialize();

    const enhancedConnection: NetworkConnection = {
      ...connection,
      provider: ledgerProvider,
      ledger: {
        deviceId: dmkManager.getDeviceId()!,
        modelId: dmkManager.getModelId()!,
        accounts: ledgerProvider.getAccounts(),
        isConnected: dmkManager.isConnected(),
      },
    };

    return { connection: enhancedConnection };
  },

  connectionClosed: async ({ connection }, _context) => {
    if (connection.ledger) {
      const provider = connection.provider as LedgerProvider;
      await provider.disconnect();
    }
    return {};
  },
};

export default networkHookHandler;