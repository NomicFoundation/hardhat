import { DeploymentState } from "../src/deployment-state";
import { Executor } from "../src/executors/Executor";
import { Hold } from "../src/executors/Hold";
import { InternalFuture } from "../src/futures/InternalFuture";
import { IFuture } from "../src/futures/types";
import {
  ArtifactsProvider,
  ConfigProvider,
  EIP1193Provider,
  GasProvider,
  HasParamResult,
  IgnitionSigner,
  Providers,
  SignersProvider,
  TransactionsProvider,
} from "../src/providers";

import { ParamValue } from "./modules/types";

export function getMockedProviders(): Providers {
  return {
    artifacts: new MockArtifactsProvider(),
    ethereumProvider: new MockEthereumProvider(),
    gasProvider: new MockGasProvider(),
    signers: new MockSignersProvider(),
    transactions: new TransactionsMockProvider(),
    config: new ConfigMockProvider(),
  };
}

export function emptyDeploymentResult() {
  return new DeploymentState();
}

/**
 * Test executor that receives a number (or a future that produces a number)
 * and increments it.
 */
export function inc(
  moduleId: string,
  futureId: string,
  x: IFuture<number>
): IncreaseNumberExecutor {
  return new IncreaseNumberExecutor(
    new IncreaseNumberFuture(moduleId, futureId, x)
  );
}

class MockEthereumProvider implements EIP1193Provider {
  public async request(): Promise<never> {
    throw new Error("not implemented");
  }
}

class MockGasProvider implements GasProvider {
  public async estimateGasLimit(): Promise<never> {
    throw new Error("not implemented");
  }

  public async estimateGasPrice(): Promise<never> {
    throw new Error("not implemented");
  }
}

class MockSigner implements IgnitionSigner {
  public async sendTransaction(): Promise<never> {
    throw new Error("not implemented");
  }
}

class MockSignersProvider implements SignersProvider {
  public async getDefaultSigner(): Promise<IgnitionSigner> {
    return new MockSigner();
  }
}

class TransactionsMockProvider implements TransactionsProvider {
  public async isConfirmed(): Promise<boolean> {
    throw new Error("not implemented");
  }
  public async isMined(): Promise<boolean> {
    throw new Error("not implemented");
  }
}

class ConfigMockProvider implements ConfigProvider {
  public setParams(_parameters: { [key: string]: ParamValue }): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public hasParam(_paramName: string): Promise<HasParamResult> {
    throw new Error("Method not implemented.");
  }

  public getParam(_paramName: string): Promise<ParamValue> {
    throw new Error("not implemented");
  }
}

class MockArtifactsProvider implements ArtifactsProvider {
  public async getArtifact(_name: string): Promise<never> {
    throw new Error("not implemented");
  }
  public async hasArtifact(_name: string): Promise<never> {
    throw new Error("not implemented");
  }
}

class IncreaseNumberFuture extends InternalFuture<IFuture<number>, number> {
  public getDependencies(): InternalFuture[] {
    return InternalFuture.isFuture(this.input) ? [this.input] : [];
  }
}

class IncreaseNumberExecutor extends Executor<IFuture<number>, number> {
  public behavior: "default" | "on-demand" | "fail" | "hold" = "default";
  public finish: any;

  public async execute(input: number): Promise<number> {
    if (this.behavior === "default") {
      return input + 1;
    } else if (this.behavior === "on-demand") {
      return new Promise((resolve) => {
        this.finish = () => resolve(input + 1);
      });
    } else if (this.behavior === "fail") {
      throw new Error("Fail");
    } else if (this.behavior === "hold") {
      throw new Hold("Hold");
    }

    const exhaustiveCheck: never = this.behavior;
    return exhaustiveCheck;
  }

  public async validate(): Promise<string[]> {
    return [];
  }

  public getDescription() {
    const input = this.future.input;

    if (typeof input === "number") {
      return `Increase ${input}`;
    } else {
      return `Increase result of ${(input as any).id}`;
    }
  }
}

export async function runUntil(
  generator: AsyncGenerator<any>,
  condition: (result: DeploymentState | undefined | void) => boolean,
  extraTicks = 5
) {
  let result: any;
  while (true) {
    result = (await generator.next()).value;
    if (condition(result)) {
      break;
    }
  }

  for (let i = 0; i < extraTicks; i++) {
    await generator.next();
  }

  return result;
}

export async function runUntilReady(generator: AsyncGenerator<any>) {
  return runUntil(generator, (result) => result !== undefined);
}
