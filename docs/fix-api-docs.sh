#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

for f in $(find api -name '*.md'); do
  printf -- '---\nsidebar: \"auto\"\nnext: false\nprev: false\n---\n' | cat - $f > text.txt.tmp
  mv text.txt.tmp $f
  sed -i -e "s+$DIR/node_modules/++g" $f
done
