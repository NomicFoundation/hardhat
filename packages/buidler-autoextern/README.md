[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-autoextern.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-autoextern)


	
 
 # buidler-solhint
[Buidler](http://getbuidler.com) plugin to generate testable contracts.

 ## What
This plugin creates contracts that converts all its internal functions into external.

 ## Installation
```
npm install @nomiclabs/buidler-autoextern
```

 And add the following require to the top of your ```buidler.config.js```:

 ```require("@nomiclabs/buidler-autoextern")```
 ## Tasks
This plugin overrides the ```compile:get-source-paths``` internal task and creates a new testable contract for every contract with the enabling annotation and they will be added into the compilation pipeline.

 ## Environment extensions
This plugin does not extend the environment.

 ## Usage
There are no additional steps you need to take for this plugin to work. Install it, run `npx buidler compile` and the generated contracts will be located in the cache directory.

This plugin can by configured by setting a `autoextern` entry in `buidler.config.js`. Its options are:
```enableForFileAnnotation: string```: the annotation which flag the contract to processed by the plugin, ```"#buidler-autoextern"``` by default.
```exportableFunctionNamePattern: RegExp```: the pattern used to test contract's function names, ```/^_/``` by default.
```contractNameTransformer: (name: string) => string```: a function to transform the contract's name. By default it will add ```"Testable"``` to the contact's name.
```functiontNameTransformer: (name: string) => string```: a function to transform the contract's function names. By default it will remove the first character of the function's name.
