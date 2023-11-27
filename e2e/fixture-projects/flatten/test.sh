#! /usr/bin/env sh

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






