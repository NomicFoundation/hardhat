#!/usr/bin/env bash

set -o errexit
trap cleanup EXIT

cleanup() {
  if [ -n "$ganache_pid" ] && ps -p $ganache_pid > /dev/null; then
    kill -9 $ganache_pid
  fi
}

ganache_running() {
  nc -z localhost 8545
}

start_ganache() {
  node_modules/.bin/ganache-cli > /dev/null &
  ganache_pid=$!
  sleep 4
}

if ganache_running; then
  echo "Using existing ganache instance"
else
  echo "Starting our own ganache instance"
  start_ganache
fi

node_modules/.bin/mocha --exit