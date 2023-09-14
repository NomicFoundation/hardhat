import { StoredDeployment } from "@ignored/ignition-core/ui-helpers";
import React from "react";
import { Page, PageTitle, Panel } from "../../components/shared";
import { VisualizationDetails } from "./components/visualization-details";
import { VisualizationSummary } from "./components/visualization-summary";

export const VisualizationOverview: React.FC<{ deployment: StoredDeployment }> =
  ({ deployment }) => {
    return (
      <Page>
        <header>
          <PageTitle>Ignition - {deployment.module.id}</PageTitle>
        </header>

        <Panel>
          <VisualizationSummary deployment={deployment} />
        </Panel>

        <Panel>
          <VisualizationDetails deployment={deployment} />
        </Panel>
      </Page>
    );
  };
