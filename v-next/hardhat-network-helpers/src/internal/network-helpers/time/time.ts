import type { NumberLike, Time as TimeI } from "../../../types.js";
import type { NetworkHelpers } from "../network-helpers.js";
import type { ChainType } from "hardhat/types/network";
import type { EthereumProvider } from "hardhat/types/providers";

import { bindAllMethods } from "@nomicfoundation/hardhat-utils/lang";

import { Duration } from "../duration/duration.js";

import { increaseTo } from "./helpers/increase-to.js";
import { increase } from "./helpers/increase.js";
import { latestBlock } from "./helpers/latest-block.js";
import { latest } from "./helpers/latest.js";
import { setNextBlockTimestamp } from "./helpers/set-next-block-timestamp.js";

export class Time<ChainTypeT extends ChainType | string>
  implements TimeI
{
  readonly #networkHelpers: NetworkHelpers<ChainTypeT>;
  readonly #provider: EthereumProvider;

  public readonly duration: Duration;

  constructor(
    networkHelpers: NetworkHelpers<ChainTypeT>,
    provider: EthereumProvider,
  ) {
    this.#networkHelpers = networkHelpers;
    this.#provider = provider;

    this.duration = new Duration();
    bindAllMethods(this);
  }

  public async increase(amountInSeconds: NumberLike): Promise<number> {
    await this.#networkHelpers.throwIfNotDevelopmentNetwork();
    return increase(this.#provider, this.#networkHelpers, amountInSeconds);
  }

  public async increaseTo(timestamp: NumberLike | Date): Promise<void> {
    await this.#networkHelpers.throwIfNotDevelopmentNetwork();
    return increaseTo(
      this.#provider,
      this.#networkHelpers,
      timestamp,
      this.duration,
    );
  }

  public async latest(): Promise<number> {
    await this.#networkHelpers.throwIfNotDevelopmentNetwork();
    return latest(this.#provider);
  }

  public async latestBlock(): Promise<number> {
    await this.#networkHelpers.throwIfNotDevelopmentNetwork();
    return latestBlock(this.#provider);
  }

  public async setNextBlockTimestamp(
    timestamp: NumberLike | Date,
  ): Promise<void> {
    await this.#networkHelpers.throwIfNotDevelopmentNetwork();
    return setNextBlockTimestamp(this.#provider, timestamp, this.duration);
  }
}
