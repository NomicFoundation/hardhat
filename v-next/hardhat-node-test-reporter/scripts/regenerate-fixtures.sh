#!/usr/bin/env bash
set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd $DIR/..

pnpm build

# Check if aha and wkhtmltoimage are installed
which aha > /dev/null 2>&1 || (echo "Please install aha using apt or something similar. See: https://github.com/theZiz/aha"; exit 1)
which wkhtmltoimage > /dev/null 2>&1 || (echo "Please install wkhtmltoimage using apt or something similar. See: https://wkhtmltopdf.org"; exit 1)


# If XDG_RUNTIME_DIR is not set, set it to $HOME to avoid a warning from wkhtmltoimage
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:=$HOME}"

if [ -n "${1:-}" ]; then
  dirs="integration-tests/fixture-tests/$1"
else
  dirs="integration-tests/fixture-tests/**"
fi

for dir in $dirs; do
  echo "Regenerating fixtures for $dir"

  options=""
  if [ -f "$dir/options.json" ]; then
    if [[ "$(jq .only "$dir/options.json")" == "true" ]]; then
      options="$options --test-only"
    fi
  fi

  node --import tsx/esm --test --test-reporter=./dist/src/reporter.js $options $dir/*.ts --color > $dir/result.txt || true # Ignore failures, as they are expected

  if grep -q '^Node\.js' $dir/result.txt; then
    sed -i '1,/^Node\.js/d' $dir/result.txt;
  fi

  cat $dir/result.txt | aha --black > $dir/result.html;

  wkhtmltoimage --quiet --format svg $dir/result.html $dir/result.svg;

  rm $dir/result.html
done
