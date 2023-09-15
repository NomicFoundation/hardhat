# Ignition Visualize UI

The website used in Ignitions `visualize` task for visualising a deployment.

## Development

A development server can be run from the root of this package with:

```sh
npm run dev
```

By default in development the deployment in `./public/deployment.json` is used,
to overwrite this example deployment, update the module in
`./examples/ComplexModule.js` and run the regenerate command:

```sh
npm run regenerate-deployment-example
```

