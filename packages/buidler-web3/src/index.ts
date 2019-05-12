import { extendEnvironment } from "@nomiclabs/buidler/config";
import {
  ensurePluginLoadedWithUsePlugin,
  lazyFunction,
  lazyObject
} from "@nomiclabs/buidler/plugins";

import { Web3HTTPProviderAdapter } from "./web3-provider-adapter";

ensurePluginLoadedWithUsePlugin();

export default function() {
  extendEnvironment(env => {
    try {
      // We require this file bebause it is required when loading web3,
      // and it messes with global.web3.
      //
      // As we use a lazy object in global.web3, that triggers a full load
      // of web3 if someone touches it, and web3 touches it when loading,
      // a recrusive load will be started, and node will resolve
      // require("web3") to an empty object.
      //
      // If we load it before assigning the global.web3 object, then it
      // will be cached by node and never mess with our lazy object.
      //
      // tslint:disable-next-line no-implicit-dependencies
      require("web3-core-requestmanager/src/givenProvider.js");
    } catch (e) {
      // This file was removed in beta 38, which doesn't mess
      // with global.web3 during module loading anymore.
      // We have this empty catch to prevent this plugin from breaking
      // if web3 is upadted and this isn't revisited.
    }

    env.Web3 = lazyFunction(() => require("web3"));
    env.web3 = lazyObject(
      () => new env.Web3(new Web3HTTPProviderAdapter(env.ethereum))
    );
  });
}
