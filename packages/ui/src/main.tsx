import React from "react";

import type { StoredDeployment } from "@ignored/ignition-core/ui-helpers";
import { StoredDeploymentDeserializer } from "@ignored/ignition-core/ui-helpers";
import ReactDOM from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { FutureDetails } from "./pages/future-details/future-details";
import { PlanOverview } from "./pages/plan-overview/plan-overview";

const loadDeploymentFromEmbeddedDiv = (): StoredDeployment | null => {
  const scriptTag = document.getElementById("deployment");

  if (scriptTag === null || scriptTag.textContent === null) {
    return null;
  }

  const data = JSON.parse(scriptTag.textContent);

  if (data.unloaded) {
    return null;
  }

  return StoredDeploymentDeserializer.deserialize(data);
};

const loadDeploymentFromDevFile = async () => {
  const response = await fetch("./deployment.json");
  const data = await response.json();
  return StoredDeploymentDeserializer.deserialize(data);
};

const loadDeploymentData = () => {
  return loadDeploymentFromEmbeddedDiv() ?? loadDeploymentFromDevFile();
};

const main = async () => {
  try {
    const deployment = await loadDeploymentData();

    const router = createHashRouter([
      {
        path: "/",
        element: <PlanOverview deployment={deployment} />,
      },
      {
        path: "/future/:futureId",
        element: <FutureDetails deployment={deployment} />,
      },
    ]);

    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <React.StrictMode>
        <RouterProvider router={router} />
      </React.StrictMode>
    );
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "unknown error";

    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <div>
        <h2>
          Error during deployment loading: <em>{message}</em>
        </h2>
      </div>
    );
  }
};

main();
