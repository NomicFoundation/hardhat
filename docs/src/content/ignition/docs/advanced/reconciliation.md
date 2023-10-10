# Reconciliation

- This section explains the reconciliation process in more detail

- When you resume a deployment, your modules may have changed in ways that are incompatible with what you already run.

- Not every change leads to incompatibilities.

  - Some changes express the same thing in a different way.
  - Changes to futures that haven't been executed yet doesn't lead to incompatibilities.
  - Removing futures doesn't lead to incompatibilities

- The reconociliation process detects any incompatiblity, preventing the deployment if any, and reporting what it found.

- To can fix a reconciliation error in two ways
  - Change your module so that it's compatible with what you executed
  - Wipe the futures that have conflicts, so that ignition re-executes them
