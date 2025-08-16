import type { ConfigHookHandler } from "hardhat/types/hooks";
import { z } from "zod";

const ledgerOptionsSchema = z.object({
  derivationFunction: z.function()
    .args(z.number())
    .returns(z.string())
    .optional(),
  dmkOptions: z.object({
    connectionTimeout: z.number().min(1000).max(60000).optional(),
    deviceFilter: z.object({
      modelId: z.string().optional(),
      deviceId: z.string().optional(),
    }).optional(),
    transportType: z.enum(["usb", "ble"]).optional(),
  }).optional(),
}).optional();

const networkConfigSchema = z.object({
  ledgerAccounts: z.union([
    z.array(z.string()),
    z.array(z.number()),
  ]).optional(),
  ledgerOptions: ledgerOptionsSchema,
});

const configHookHandler: ConfigHookHandler = {
  resolved: async ({ resolvedConfig, userConfig }, { config }) => {
    for (const networkName of Object.keys(resolvedConfig.networks)) {
      const network = resolvedConfig.networks[networkName];
      const userNetwork = userConfig.networks?.[networkName] || {};

      try {
        const parsedConfig = networkConfigSchema.parse({
          ledgerAccounts: userNetwork.ledgerAccounts,
          ledgerOptions: userNetwork.ledgerOptions,
        });

        if (parsedConfig.ledgerAccounts !== undefined) {
          network.ledgerAccounts = parsedConfig.ledgerAccounts;
        }

        if (parsedConfig.ledgerOptions !== undefined) {
          network.ledgerOptions = {
            derivationFunction: parsedConfig.ledgerOptions.derivationFunction || 
              ((index: number) => `m/44'/60'/0'/0/${index}`),
            dmkOptions: {
              connectionTimeout: parsedConfig.ledgerOptions.dmkOptions?.connectionTimeout || 30000,
              deviceFilter: parsedConfig.ledgerOptions.dmkOptions?.deviceFilter,
              transportType: parsedConfig.ledgerOptions.dmkOptions?.transportType || "usb",
            },
          };
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const issues = error.issues.map(issue => 
            `  - ${issue.path.join(".")}: ${issue.message}`
          ).join("\n");
          
          throw new Error(
            `Invalid Ledger configuration for network "${networkName}":\n${issues}`
          );
        }
        throw error;
      }
    }

    return { resolvedConfig };
  },
};

export default configHookHandler;