#!/bin/sh
# Installed as ~/.local/bin/orca-dev-install (a symlink); resolves back to the repo's installer.
set -eu
script_path=$(readlink -f "$0")
exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON "$(dirname "$script_path")/orca-dev-install.mjs" "$@"
