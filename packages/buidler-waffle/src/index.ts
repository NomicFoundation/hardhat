import {
  extendConfig,
  extendEnvironment,
  usePlugin
} from "@nomiclabs/buidler/config";

import { WaffleMockProviderAdapter } from "./waffle-provider-adapter";

export default function() {
  // const waffleProviderModulePath = require.resolve(
  //   "@ethereum-waffle/provider",
  //   {
  //     paths: [require.resolve("ethereum-waffle")]
  //   }
  // );
  //
  // const {
  //   defaultWaffleAccounts
  // }: {
  //   defaultWaffleAccounts: Array<{
  //     balance: string;
  //     secretKey: string;
  //   }>;
  // } = require(waffleProviderModulePath);
  //
  // extendConfig((resolvedConfig, userConfig) => {
  //   if (
  //     userConfig.networks !== undefined &&
  //     userConfig.networks.buidlerevm !== undefined &&
  //     userConfig.networks.buidlerevm.accounts !== undefined
  //   ) {
  //     return;
  //   }
  //
  //   resolvedConfig.networks.buidlerevm.accounts = defaultWaffleAccounts.map(
  //     acc => ({
  //       privateKey: acc.secretKey,
  //       balance: acc.balance
  //     })
  //   );
  // });

  extendEnvironment(bre => {
    // There's some problems with the `options` private property of Waffle's MockProvider
    // it can't be correctly implemented, possibly because it depends on Ganache types.
    // That's why we cast it here 🤮, but as it's just a private property it should work.
    // TODO: FIX THIS!
    bre.waffle = {
      provider: new WaffleMockProviderAdapter(bre.network) as any
    };
  });

  usePlugin("@nomiclabs/buidler-ethers");
}
