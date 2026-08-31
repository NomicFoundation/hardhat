# Shell library — source from a scenario's preinstall script.
#
# Usage:
#   . "$E2E_TEST_DIR/../_shared/foundry-install.sh"
#   install_foundry vX.Y.Z
#
# Each scenario that sources this file must also prepend $HOME/.foundry/bin
# to PATH via its scenario.json `env` block so that `forge` is discoverable
# by hyperfine benchmark commands (the preinstall script's process exits
# before those commands run).

# The bootstrap below is adapted from the official foundryup installer at
# https://foundry.paradigm.xyz (source:
# https://github.com/foundry-rs/foundry/blob/master/foundryup/install),
# reduced to the steps we need: download the `foundryup` script and mark it
# executable. We skip the upstream installer's $SHELL detection and rc-file
# mutation because (a) that block exits non-zero in environments where $SHELL
# doesn't match its known cases, and (b) each scenario.json already prepends
# $HOME/.foundry/bin to PATH for the benchmark commands.
#
# foundry is dual-licensed under MIT and Apache-2.0. The MIT notice:
#   Copyright (c) 2021 Georgios Konstantopoulos
#   https://github.com/foundry-rs/foundry/blob/master/LICENSE-MIT
install_foundry() {
  local version="$1"
  local foundry_bin_dir="${FOUNDRY_DIR:-$HOME/.foundry}/bin"
  local foundryup_path="$foundry_bin_dir/foundryup"

  if [ ! -x "$foundryup_path" ]; then
    mkdir -p "$foundry_bin_dir"
    curl -sSfL \
      "https://raw.githubusercontent.com/foundry-rs/foundry/HEAD/foundryup/foundryup" \
      -o "$foundryup_path"
    chmod +x "$foundryup_path"
  fi

  "$foundryup_path" --install "$version"
}
