import ora from "ora";
import EventEmitter from "events";

export type OutputControlledEmitter = EventEmitter & {
  isOutputEnabled: boolean;
};

export function withSpinners<T extends OutputControlledEmitter>(emitter: T): T {
  attachSpinner(emitter, {
    startText: "[hardhat-ledger] Connecting wallet",
    eventPrefix: "connection",
  });

  attachSpinner(emitter, {
    startText: "[hardhat-ledger] Waiting for confirmation",
    eventPrefix: "confirmation",
  });

  const derivationSpinner = attachSpinner(emitter, {
    startText: "[hardhat-ledger] Finding derivation path",
    eventPrefix: "derivation",
  });
  emitter.on("derivation_progress", (path: string, index: number) =>
    emitter.isOutputEnabled
      ? (derivationSpinner.text = `[hardhat-ledger] Deriving address #${index} (path "${path}")`)
      : undefined
  );

  return emitter;
}

function attachSpinner(
  emitter: OutputControlledEmitter,
  spinnerOptions: {
    startText: string;
    eventPrefix: string;
  }
): ora.Ora {
  const { startText, eventPrefix } = spinnerOptions;
  const spinner = ora({ text: startText, discardStdin: false });

  emitter.on(`${eventPrefix}_start`, () =>
    emitter.isOutputEnabled ? spinner.start() : undefined
  );
  emitter.on(`${eventPrefix}_success`, () =>
    emitter.isOutputEnabled ? spinner.succeed() : undefined
  );
  emitter.on(`${eventPrefix}_failure`, () =>
    emitter.isOutputEnabled ? spinner.fail() : undefined
  );

  return spinner;
}
