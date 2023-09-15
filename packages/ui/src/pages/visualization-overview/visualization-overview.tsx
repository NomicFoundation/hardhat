import {
  IgnitionModule,
  IgnitionModuleResult,
} from "@nomicfoundation/ignition-core/ui-helpers";
import React from "react";
import { Page, PageTitle, Panel } from "../../components/shared";
import { VisualizationDetails } from "./components/visualization-details";
import { VisualizationSummary } from "./components/visualization-summary";

export const VisualizationOverview: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
}> = ({ ignitionModule }) => {
  return (
    <Page>
      <header>
        <PageTitle>Ignition - {ignitionModule.id}</PageTitle>
      </header>

      <Panel>
        <VisualizationSummary ignitionModule={ignitionModule} />
      </Panel>

      <Panel>
        <VisualizationDetails ignitionModule={ignitionModule} />
      </Panel>
    </Page>
  );
};
