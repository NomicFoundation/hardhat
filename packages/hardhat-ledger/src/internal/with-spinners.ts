import ora from "ora";

import { LedgerProvider } from "../provider";
import EventEmitter from "events";

export function withSpinners(ledgerProvider: LedgerProvider) {
  attachSpinner(ledgerProvider, {
    startText: "Connecting to Ledger wallet",
    eventPrefix: "connection",
  });

  attachSpinner(ledgerProvider, {
    startText: "Waiting for confirmation",
    eventPrefix: "confirmation",
  });

  const derivationSpinner = attachSpinner(ledgerProvider, {
    startText: "Finding derivation path",
    eventPrefix: "derive",
  });
  ledgerProvider.on(
    "derive_progress",
    (path: string) => (derivationSpinner.text = `Deriving path "${path}"`)
  );
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
