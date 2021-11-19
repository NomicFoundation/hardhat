import { render, useInput } from "ink";
import { useRef, useState } from "react";

import { IgnitionUi } from "../src/ui/components";
import { UiData } from "../src/ui/ui-data";

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
      (d) => d.startExecutor("MyModule", "Foo"),
      (d) => d.finishExecutor("MyModule", "Foo"),
    ],
  });

  examples.push({
    description: "Single module with two contracts deployed in parallel",
    initialData: {
      MyModule: ["Foo", "Bar"],
    },
    transitions: [
      (d) => {
        d.startExecutor("MyModule", "Foo");
        d.startExecutor("MyModule", "Bar");
      },
      (d) => d.finishExecutor("MyModule", "Bar"),
      (d) => d.finishExecutor("MyModule", "Foo"),
    ],
  });

  examples.push({
    description: "Two modules",
    initialData: {
      MyModule: ["Foo"],
      MyOtherModule: ["Bar"],
    },
    transitions: [
      (d) => d.startExecutor("MyModule", "Foo"),
      (d) => d.finishExecutor("MyModule", "Foo"),
      (d) => d.startExecutor("MyOtherModule", "Bar"),
      (d) => d.finishExecutor("MyOtherModule", "Bar"),
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
  const uiData = useRef(new UiData(initialData));
  const [transitionIndex, setTransitionIndex] = useState(0);

  useInput((input, key) => {
    if (input === "n") {
      if (transitionIndex < transitions.length) {
        transitions[transitionIndex](uiData.current);
        setTransitionIndex(transitionIndex + 1);
      } else {
        onFinish();
      }
    }
  });

  return <IgnitionUi uiData={uiData.current} />;
};

main();
