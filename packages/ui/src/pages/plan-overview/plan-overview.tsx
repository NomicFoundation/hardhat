import { StoredDeployment } from "@ignored/ignition-core/ui-helpers";
import React from "react";
import { Page, PageTitle, Panel } from "../../components/shared";
import { PlanDetails } from "./components/plan-details";
import { PlanSummary } from "./components/plan-summary";

export const PlanOverview: React.FC<{ deployment: StoredDeployment }> = ({
  deployment,
}) => {
  return (
    <Page>
      <header>
        <PageTitle>Ignition - {deployment.module.id}</PageTitle>
      </header>

      <Panel>
        <PlanSummary deployment={deployment} />
      </Panel>

      <Panel>
        <PlanDetails deployment={deployment} />
      </Panel>
    </Page>
  );
};
