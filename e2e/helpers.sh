#!/usr/bin/env bash

# fail if any commands fails
set -e

print_error_msg() {
  echo "\033[31mERROR: $1\033[0m"
}

run_test_and_handle_failure() {
  # $1 command to execute
  # $2 expected exit code
  # $3 additional error message

  command_to_execute="$1"
  expected_exit_code="$2"
  additional_error_message="$3"

  if [ "$expected_exit_code" -eq "0" ]; then
    # the command should be executed successfully
    if ! $command_to_execute >stdout 2>stderr; then
      print_error_msg "The command failed.\nOutput:'$(cat stdout)'\nError: '$(cat stderr)'\n$additional_error_message"
      exit 1
    fi
  else
    # the command should fail
    if $command_to_execute >stdout 2>stderr; then
      print_error_msg "The command should have failed.\nOutput:'$(cat stdout)'\nError: '$(cat stderr)'\n$additional_error_message"
      exit 1
    fi
  fi
}

assert_directory_exists() {
  if [ ! -d "$1" ]; then
    echo "Expected directory $1 to exist, but it doesn't"
    exit 1
  fi
}

assert_directory_does_not_exist() {
  if [ -d "$1" ]; then
    echo "Expected directory $1 to not exist, but it does"
    exit 1
  fi
}

assert_directory_empty() {
  if [ "$(ls -A $1)" ]; then
    echo "Expected directory $1 to be empty, but it isn't"
    exit 1
  fi
}

assert_directory_not_empty() {
  if [ ! "$(ls -A $1)" ]; then
    echo "Expected directory $1 to not be empty, but it is"
    exit 1
  fi
}
