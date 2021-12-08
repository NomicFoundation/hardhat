import { render, useInput } from "ink";
import { useRef, useState } from "react";
import {
  BindingState,
  DeploymentState,
  ModuleState,
} from "../src/deployment-state";

import { IgnitionUi } from "../src/ui/components";

import { Example } from "./types";

async function main() {
  const examples = getExamples();

  for (const example of examples) {
    console.log(example.description);
    console.log(example.description.replace(/./g, "="));
    console.log();

    await renderExample(example);

    console.log();
  }
}

function getExamples(): Example[] {
  const examples: Example[] = [];

  examples.push({
    description: "Single module with single contract",
    initialData: {
      MyModule: ["Foo"],
    },
    transitions: [
      (d) => d.setBindingState("MyModule", "Foo", BindingState.running()),
      (d) => d.setBindingState("MyModule", "Foo", BindingState.success(1)),
    ],
  });

  examples.push({
    description: "Single module with two contracts deployed in parallel",
    initialData: {
      MyModule: ["Foo", "Bar"],
    },
    transitions: [
      (d) => {
        d.setBindingState("MyModule", "Foo", BindingState.running());
        d.setBindingState("MyModule", "Bar", BindingState.running());
      },
      (d) => d.setBindingState("MyModule", "Bar", BindingState.success(2)),
      (d) => d.setBindingState("MyModule", "Foo", BindingState.success(1)),
    ],
  });

  examples.push({
    description: "Two modules",
    initialData: {
      MyModule: ["Foo"],
      MyOtherModule: ["Bar"],
    },
    transitions: [
      (d) => d.setBindingState("MyModule", "Foo", BindingState.running()),
      (d) => d.setBindingState("MyModule", "Foo", BindingState.success(1)),
      (d) => d.setBindingState("MyOtherModule", "Bar", BindingState.running()),
      (d) => d.setBindingState("MyOtherModule", "Bar", BindingState.success(1)),
    ],
  });

  examples.push({
    only: true,
    description: "Two parallel deploys followed by two parallel calls",
    initialData: {
      MyModule: ["Foo", "Bar", "Foo.f", "Bar.b"],
    },
    transitions: [
      (d) => {
        d.setBindingState("MyModule", "Foo", BindingState.running());
        d.setBindingState("MyModule", "Bar", BindingState.running());
      },
      (d) => d.setBindingState("MyModule", "Bar", BindingState.success(1)),
      (d) => d.setBindingState("MyModule", "Foo", BindingState.success(1)),
      (d) => d.setBindingState("MyModule", "Foo.f", BindingState.running()),
      (d) => d.setBindingState("MyModule", "Bar.b", BindingState.running()),
      (d) => d.setBindingState("MyModule", "Foo.f", BindingState.success(1)),
      (d) => d.setBindingState("MyModule", "Bar.b", BindingState.success(1)),
    ],
  });

  if (examples.some((x) => x.only)) {
    return examples.filter((x) => x.only);
  }

  return examples;
}

function renderExample(example: Example) {
  return new Promise<void>((resolve) => {
    const { unmount } = render(
      <ExampleRenderer
        example={example}
        onFinish={() => {
          unmount();
          resolve();
        }}
      />
    );
  });
}

const ExampleRenderer = ({
  example: { initialData, transitions },
  onFinish,
}: {
  example: Example;
  onFinish: () => void;
}) => {
  const deploymentState = new DeploymentState();
  for (const [moduleId, bindingsIds] of Object.entries(initialData)) {
    const moduleState = new ModuleState(moduleId);
    for (const bindingId of bindingsIds) {
      moduleState.addBinding(bindingId, BindingState.waiting());
    }
    deploymentState.addModule(moduleState);
  }
  const deploymentStateRef = useRef(deploymentState);
  const [transitionIndex, setTransitionIndex] = useState(0);

  useInput((input, key) => {
    if (input === "n") {
      if (transitionIndex < transitions.length) {
        transitions[transitionIndex](deploymentStateRef.current);
        setTransitionIndex(transitionIndex + 1);
      } else {
        onFinish();
      }
    }
  });

  return <IgnitionUi deploymentState={deploymentStateRef.current} />;
};

main();
