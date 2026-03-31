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

  # TODO: If we ever encounter more tests that are sensitive to the node version,
  # we should either add a more robust way of detecting such tests or version
  # all the test result files.
  result_file_name="result"
  if [ "$dir" == "integration-tests/fixture-tests/nested-test" ]; then
    node_major_version="$(node --version | cut -d. -f1)"
    result_file_name="result.$node_major_version"
  fi

  result_txt="$dir/$result_file_name.txt"
  result_html="$dir/$result_file_name.html"
  result_svg="$dir/$result_file_name.svg"

  node --import tsx/esm --test --test-reporter=./dist/src/reporter.js $options $dir/*.ts --color > "$result_txt" || true # Ignore failures, as they are expected

  if grep -q '^Node\.js' "$result_txt"; then
    sed -i '1,/^Node\.js/d' "$result_txt";
  fi

  cat "$result_txt" | aha --black > "$result_html";

  wkhtmltoimage --quiet --format svg "$result_html" "$result_svg";

  rm "$result_html";
done
