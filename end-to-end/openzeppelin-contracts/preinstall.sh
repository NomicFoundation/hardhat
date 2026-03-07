#!/usr/bin/env bash
set -e

# The current commit needs updated
sed -i 's/"@nomicfoundation\/hardhat-mocha": "\^3\.0\.12"/"@nomicfoundation\/hardhat-mocha": "^3.0.11"/g' ./package.json

# The package-lock has out of date packages that don't exist
rm package-lock.json