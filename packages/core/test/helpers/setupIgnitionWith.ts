import { ICommandJournal } from "../../src";
import { Ignition } from "../../src/Ignition";
import { NoopCommandJournal } from "../../src/internal/journal/NoopCommandJournal";
import { Services } from "../../src/internal/types/services";

class TestIgnition extends Ignition {
  constructor({
    services,
    journal = new NoopCommandJournal(),
  }: {
    services: Services;
    journal?: ICommandJournal;
  }) {
    super({ services, uiRenderer: () => {}, journal });
  }
}

export function setupIgnitionWith({
  services,
  journal,
}: {
  services: Services;
  journal?: ICommandJournal;
}) {
  return new TestIgnition({ services, journal });
}
