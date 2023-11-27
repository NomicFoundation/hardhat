#! /usr/bin/env sh

# replace the hardhat version in the files used to check that the output is correct because it changes in every release
sed -i "s/hardhat v[0-9]*\.[0-9]*\.[0-9]*/hardhat v$1/g" "flatten_all_files.txt"
sed -i "s/hardhat v[0-9]*\.[0-9]*\.[0-9]*/hardhat v$1/g" "flatten_lock_file.txt"

# it should flatten all the files in the folder because no file names are passed
if ! npx hardhat flatten | diff - flatten_all_files.txt; then
    echo "The flatten file is different from the flatten_all_files.txt"
    exit 1
fi

# it should flatten only the 'Lock.sol' file because it is passed as an argument
if ! npx hardhat flatten contracts/Lock.sol | diff - flatten_lock_file.txt; then
    echo "The flatten file is different from the flatten_lock_file.txt"
    exit 1
fi
