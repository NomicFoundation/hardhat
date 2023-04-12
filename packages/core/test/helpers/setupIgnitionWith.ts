import { IgnitionImplementation } from "../../src/internal/Ignition";
import { NoopCommandJournal } from "../../src/internal/journal/NoopCommandJournal";
import { ICommandJournal } from "../../src/internal/types/journal";
import { Services } from "../../src/internal/types/services";

class TestIgnition extends IgnitionImplementation {
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
