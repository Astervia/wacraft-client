#!/usr/bin/env bash
# pre-pr-check.sh — run all CI checks locally before pushing a PR.
# Mirrors: quality-and-security.yml, secret-scanning.yml (gitleaks).
# CodeQL (GitHub-only) and SBOM (artifact-only) are intentionally skipped.
#
# Dependency graph (matches CI jobs):
#   Wave 1 (parallel): lint | prettier | conftest | gitleaks
#   Wave 2:            npm_audit    <- needs lint + prettier
#   Wave 3:            build        <- needs npm_audit
#   conftest / gitleaks run freely and never block other waves.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; RESET='\033[0m'

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

declare -A PIDS STATUS
declare -a ORDER PENDING

# ── helpers ───────────────────────────────────────────────────────────────────
banner() { echo -e "\n${CYAN}${BOLD}── $* ──${RESET}"; }
has_tool() { command -v "$1" &>/dev/null; }

# ── hints (shown on failure) ──────────────────────────────────────────────────
declare -A HINTS
HINTS[lint]="fix ESLint errors above; run: npm run lint"
HINTS[prettier]="run: npm run format to auto-fix all formatting"
HINTS[npm_audit]="upgrade the vulnerable package: npm audit fix, or: npm update <package>"
HINTS[build]="fix the build errors above; run: npm run build for details"
HINTS[conftest]="fix the Dockerfile policy violations listed above"
HINTS[gitleaks]="remove the secret from history; see: git-filter-repo or BFG"

# ── launch ────────────────────────────────────────────────────────────────────
# Run a check in the background. Output is buffered to a log file; the exit
# code is written to a status file when the command finishes. The section is
# printed by flush_completed() once that status file appears.
launch() {
    local name="$1"; shift
    ORDER+=("$name")
    PENDING+=("$name")
    local log="${WORKDIR}/${name}.log"
    local sf="${WORKDIR}/${name}.status"
    (
        "$@" > "$log" 2>&1
        echo $? > "$sf"
    ) &
    PIDS["$name"]=$!
    printf "${DIM}  %-14s started${RESET}\n" "$name"
}

# ── mark_skip ─────────────────────────────────────────────────────────────────
mark_skip() {
    local name="$1" reason="$2"
    ORDER+=("$name")
    STATUS["$name"]=skip
    echo -e "\n${YELLOW}${BOLD}┌─ $name${RESET}"
    echo -e "${YELLOW}│${RESET}  skipped — $reason"
    echo -e "${YELLOW}${BOLD}└─ SKIP${RESET}"
}

# ── print_section ─────────────────────────────────────────────────────────────
print_section() {
    local name="$1"
    local code="${STATUS[$name]}"
    local log="${WORKDIR}/${name}.log"
    local color label
    if [[ "$code" -eq 0 ]]; then color="$GREEN"; label="PASS"
    else                          color="$RED";   label="FAIL"
    fi

    echo -e "\n${color}${BOLD}┌─ $name${RESET}"
    if [[ -f "$log" && -s "$log" ]]; then
        while IFS= read -r line; do
            printf "${color}│${RESET}  %s\n" "$line"
        done < "$log"
    fi
    echo -e "${color}${BOLD}└─ $label${RESET}"
    if [[ "$code" -ne 0 && -n "${HINTS[$name]:-}" ]]; then
        echo -e "   ${DIM}hint: ${HINTS[$name]}${RESET}"
    fi
}

# ── flush_completed ───────────────────────────────────────────────────────────
# Print sections for any PENDING checks whose status file has appeared.
# Removes printed checks from PENDING.
flush_completed() {
    local still_pending=()
    for name in "${PENDING[@]+"${PENDING[@]}"}"; do
        local sf="${WORKDIR}/${name}.status"
        if [[ -f "$sf" ]]; then
            wait "${PIDS[$name]}" 2>/dev/null || true
            STATUS["$name"]=$(cat "$sf")
            print_section "$name"
        else
            still_pending+=("$name")
        fi
    done
    PENDING=("${still_pending[@]+"${still_pending[@]}"}")
}

# ── wait_for ──────────────────────────────────────────────────────────────────
# Block until all named checks have statuses, flushing completed sections
# (including any other in-flight checks) along the way.
wait_for() {
    while true; do
        flush_completed
        local all_done=true
        for name in "$@"; do
            [[ "${STATUS[$name]+_}" ]] || { all_done=false; break; }
        done
        $all_done && break
        sleep 0.1
    done
}

# ── gate_ok ───────────────────────────────────────────────────────────────────
# Returns 0 only if all named checks have exit code 0.
gate_ok() {
    for name in "$@"; do
        local s="${STATUS[$name]:-1}"
        [[ "$s" =~ ^[0-9]+$ && "$s" -eq 0 ]] || return 1
    done
}

# ─────────────────────────────────────────────────────────────────────────────
# Wave 1 — all independent checks in parallel
# ─────────────────────────────────────────────────────────────────────────────
banner "Wave 1 — parallel: lint | prettier | conftest | gitleaks"

launch lint npm run lint
launch prettier npm run format:check

if has_tool conftest; then
    launch conftest conftest test Dockerfile --policy policy/
else
    mark_skip conftest "not installed — https://www.conftest.dev/install/"
fi

if has_tool gitleaks; then
    launch gitleaks gitleaks detect --source . -v
else
    mark_skip gitleaks "not installed — https://github.com/gitleaks/gitleaks#installing"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Gate: wait for lint + prettier before proceeding to npm audit.
# conftest/gitleaks sections also appear here as they complete.
# ─────────────────────────────────────────────────────────────────────────────
banner "Gate — lint | prettier"
wait_for lint prettier

# ─────────────────────────────────────────────────────────────────────────────
# Wave 2 — npm audit (needs lint-and-format gate)
# ─────────────────────────────────────────────────────────────────────────────
if gate_ok lint prettier; then
    banner "Wave 2 — npm_audit"
    launch npm_audit npm audit --audit-level=high --omit=dev

    banner "Gate — npm_audit"
    wait_for npm_audit

    # ── Wave 3 — build (needs npm audit) ──────────────────────────────────
    if gate_ok npm_audit; then
        banner "Wave 3 — build"
        launch build npm run build
        wait_for build
    else
        mark_skip build "npm_audit failed"
    fi
else
    mark_skip npm_audit "lint/prettier gate failed"
    mark_skip build     "lint/prettier gate failed"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Drain any still-running wave-1 checks (conftest, gitleaks)
# ─────────────────────────────────────────────────────────────────────────────
if [[ ${#PENDING[@]} -gt 0 ]]; then
    banner "Waiting for remaining checks…"
    while [[ ${#PENDING[@]} -gt 0 ]]; do
        flush_completed
        [[ ${#PENDING[@]} -gt 0 ]] && sleep 0.1
    done
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}══════════════════════════════════════════${RESET}"
echo -e "${BOLD} Pre-PR Check Summary${RESET}"
echo -e "${BOLD}══════════════════════════════════════════${RESET}\n"

any_failed=false
for name in "${ORDER[@]}"; do
    s="${STATUS[$name]:-?}"
    if   [[ "$s" == skip ]]; then
        printf "  ${YELLOW}SKIP${RESET}  %s\n" "$name"
    elif [[ "$s" =~ ^[0-9]+$ && "$s" -eq 0 ]]; then
        printf "  ${GREEN}PASS${RESET}  %s\n" "$name"
    else
        printf "  ${RED}FAIL${RESET}  %s\n" "$name"
        printf "        ${DIM}hint: %s${RESET}\n" "${HINTS[$name]:-see output above}"
        any_failed=true
    fi
done

echo ""
if $any_failed; then
    echo -e "${RED}${BOLD}Fix the issues above before opening a PR.${RESET}"
    exit 1
else
    echo -e "${GREEN}${BOLD}All checks passed. Safe to open a PR.${RESET}"
    exit 0
fi
