#!/usr/bin/env bash
set -euo pipefail

scope="${1:-}"

echo "== Routes =="
sed -n '/export enum RoutePath {/,/^}/p' src/app/app.routes.ts

echo
echo "== Top-level app features =="
find src/app -mindepth 1 -maxdepth 1 -type d | sort

echo
echo "== Top-level core domains =="
find src/core -mindepth 1 -maxdepth 1 -type d | sort

if [[ -n "${scope}" ]]; then
    echo
    echo "== Matches for: ${scope} =="
    rg -n "${scope}" src/app src/core src/plugins || true
fi
