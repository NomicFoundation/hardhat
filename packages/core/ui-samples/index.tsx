import { render, useInput } from "ink";
import { useRef, useState } from "react";
import {
  FutureState,
  DeploymentState,
  RecipeState,
} from "../src/deployment-state";

import { IgnitionUi } from "@ignored/hardhat-ignition/src/ui/components";

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
    description: "Single recipe with single contract",
    initialData: {
      MyRecipe: ["Foo"],
    },
    transitions: [
      (d) => d.setFutureState("MyRecipe", "Foo", FutureState.running()),
      (d) => d.setFutureState("MyRecipe", "Foo", FutureState.success(1)),
    ],
  });

  examples.push({
    description: "Single recipe with two contracts deployed in parallel",
    initialData: {
      MyRecipe: ["Foo", "Bar"],
    },
    transitions: [
      (d) => {
        d.setFutureState("MyRecipe", "Foo", FutureState.running());
        d.setFutureState("MyRecipe", "Bar", FutureState.running());
      },
      (d) => d.setFutureState("MyRecipe", "Bar", FutureState.success(2)),
      (d) => d.setFutureState("MyRecipe", "Foo", FutureState.success(1)),
    ],
  });

  examples.push({
    description: "Two recipes",
    initialData: {
      MyRecipe: ["Foo"],
      MyOtherRecipe: ["Bar"],
    },
    transitions: [
      (d) => d.setFutureState("MyRecipe", "Foo", FutureState.running()),
      (d) => d.setFutureState("MyRecipe", "Foo", FutureState.success(1)),
      (d) => d.setFutureState("MyOtherRecipe", "Bar", FutureState.running()),
      (d) => d.setFutureState("MyOtherRecipe", "Bar", FutureState.success(1)),
    ],
  });

  examples.push({
    description: "Two parallel deploys followed by two parallel calls",
    initialData: {
      MyRecipe: ["Foo", "Bar", "Foo.f", "Bar.b"],
    },
    transitions: [
      (d) => {
        d.setFutureState("MyRecipe", "Foo", FutureState.running());
        d.setFutureState("MyRecipe", "Bar", FutureState.running());
      },
      (d) => d.setFutureState("MyRecipe", "Bar", FutureState.success(1)),
      (d) => d.setFutureState("MyRecipe", "Foo", FutureState.success(1)),
      (d) => d.setFutureState("MyRecipe", "Foo.f", FutureState.running()),
      (d) => d.setFutureState("MyRecipe", "Bar.b", FutureState.running()),
      (d) => d.setFutureState("MyRecipe", "Foo.f", FutureState.success(1)),
      (d) => d.setFutureState("MyRecipe", "Bar.b", FutureState.success(1)),
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
  for (const [recipeId, futuresIds] of Object.entries(initialData)) {
    const recipeState = new RecipeState(recipeId);
    for (const futureId of futuresIds) {
      recipeState.addFuture(futureId, FutureState.waiting());
    }
    deploymentState.addRecipe(recipeState);
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
