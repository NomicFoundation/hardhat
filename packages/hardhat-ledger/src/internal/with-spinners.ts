import ora from "ora";
import EventEmitter from "events";

export function withSpinners<T extends EventEmitter>(emitter: T): T {
  attachSpinner(emitter, {
    startText: "Connecting to Ledger wallet",
    eventPrefix: "connection",
  });

  attachSpinner(emitter, {
    startText: "Waiting for confirmation",
    eventPrefix: "confirmation",
  });

  const derivationSpinner = attachSpinner(emitter, {
    startText: "Finding derivation path",
    eventPrefix: "derivation",
  });
  emitter.on(
    "derive_progress",
    (path: string) => (derivationSpinner.text = `Deriving path "${path}"`)
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
  const spinner = ora(startText);

  emmiter.on(`${eventPrefix}_start`, () => spinner.start());
  emmiter.on(`${eventPrefix}_success`, () => spinner.succeed());
  emmiter.on(`${eventPrefix}_failure`, () => spinner.fail());

  return spinner;
}
