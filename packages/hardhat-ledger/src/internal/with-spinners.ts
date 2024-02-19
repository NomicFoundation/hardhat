import ora from "ora";
import EventEmitter from "events";

export function withSpinners<T extends EventEmitter>(emitter: T): T {
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
  emitter.on(
    "derivation_progress",
    (path: string, index: number) =>
      (derivationSpinner.text = `[hardhat-ledger] Deriving address #${index} (path "${path}")`)
  );

  return emitter;
}

function attachSpinner(
  emmiter: EventEmitter,
  spinnerOptions: {
    startText: string;
    eventPrefix: string;
  }
): ora.Ora {
  const { startText, eventPrefix } = spinnerOptions;
  const spinner = ora({ text: startText, discardStdin: false });

  emmiter.on(`${eventPrefix}_start`, () => spinner.start());
  emmiter.on(`${eventPrefix}_success`, () => spinner.succeed());
  emmiter.on(`${eventPrefix}_failure`, () => spinner.fail());

  return spinner;
}
