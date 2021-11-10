
# Yul and Yul+ Hardhat Plugin

This a plugin for hardhat that allows the compilation of .yul and .yulp files. They are compiled into solc artifacts (Thanks to Yul+'s sig"" function) and are mostly identical to work with from there. Its important to note this plugin is still very much in the beta, and artifacts may need to cleared after each compile. Some changes must be made to the config file as well to get it working

## Setting up a Yul+ Hardhat Project

First run
```
npx hardhat init
```

and create a new typescript project.

Next, edit your tsconfig.ts file and add the following compiler options
```
    "allowJs": true,
    "noImplicitAny": false
```
Next, clone this repo and put it all in a "Plugin Folder", then drop this folder into the root of your project directory.

Then, in your hardhatconfig.ts file, add 
```
import "./Plugin/src";
```

Now you have a fully setup Hardhat Yul+ Project!

## Quick debugging

You may need to install some js packages, namely "solc" and "yulp", however a quick npm install will fix this

## Why Yul+?

Yul+ is an amazing language that brings the efficiency gains of Yul by allowing explicit memory control, with features that increase ease of use, and a sig"" function allowing the generate ABI to be identical to that of a Solidity Contract. Yul+ was initially developed by Fuel Labs as they built out their l2 platform, and showed some impressive gas reductions, dropping the cost of the ENS by around 20%!

Understanding the intermediate language of Yul as well will also improve the efficiency of some segments of Solidity you write with the inline assembly options.

## Community

I hope to build out more of the Yul+ Community, I will be setting up more later, but as for now feel free to add a PR to this plugin, or add to the tag on Github to increase the number of resources avaliable. I will also be making a tutorial series for people looking to learn the Yul+ language.
