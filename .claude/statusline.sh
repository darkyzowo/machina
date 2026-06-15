#!/usr/bin/env bash
# machina statusline — context HUD for Claude Code CLI
#
# Shows: [CAVEMAN badge] | project | (branch) | model | ctx bar | tokens | weekly usage
#
# Install: global-setup.sh copies this to ~/.claude/statusline.sh automatically.
# Reference in ~/.claude/settings.json:
#   "statusLine": { "type": "command", "command": "bash \"$HOME/.claude/statusline.sh\"" }
# Windows (Git Bash): replace $HOME with C:/Users/YOUR_USERNAME

input=$(cat)

# Parse a field from the JSON input using Node.js
jsget() {
  node --input-type=module <<EOF 2>/dev/null
const d = JSON.parse(${input@Q} || '{}');
process.stdout.write(String($1 ?? ''));
EOF
}

model=$(jsget "d.model?.display_name ?? ''")
used_pct=$(jsget "d.context_window?.used_percentage ?? ''")
remaining_pct=$(jsget "d.context_window?.remaining_percentage ?? ''")
input_tokens=$(jsget "d.context_window?.current_usage?.input_tokens ?? ''")
ctx_size=$(jsget "d.context_window?.context_window_size ?? ''")
week_pct=$(jsget "d.rate_limits?.seven_day?.used_percentage ?? ''")
project_dir=$(jsget "d.workspace?.project_dir ?? ''")
cwd=$(jsget "d.workspace?.current_dir ?? d.cwd ?? ''")

# Project name
project=""
if [ -n "$project_dir" ]; then
  project=$(basename "$project_dir" 2>/dev/null)
elif [ -n "$cwd" ]; then
  project=$(basename "$cwd" 2>/dev/null)
fi

# Git branch
branch=""
ref_dir="${project_dir:-$cwd}"
if [ -n "$ref_dir" ] && git -C "$ref_dir" rev-parse --git-dir >/dev/null 2>&1; then
  branch=$(git -C "$ref_dir" --no-optional-locks symbolic-ref --short HEAD 2>/dev/null)
fi

# Compute bar, token count, remaining %, weekly usage in one Node call
computed=$(USED_PCT="$used_pct" REM_PCT="$remaining_pct" INPUT_TOK="$input_tokens" \
           CTX_SIZE="$ctx_size" WEEK_PCT="$week_pct" \
  node --input-type=module <<'JSEOF' 2>/dev/null
const used_pct  = parseFloat(process.env.USED_PCT  || '');
const remaining = parseFloat(process.env.REM_PCT   || '');
const input_tok = parseInt(process.env.INPUT_TOK   || '', 10);
const ctx_size  = parseInt(process.env.CTX_SIZE    || '', 10);
const week_pct  = parseFloat(process.env.WEEK_PCT  || '');

const out = [];

if (!isNaN(used_pct)) {
  const filled = Math.min(10, Math.max(0, Math.round(used_pct / 10)));
  out.push('BAR:[' + '#'.repeat(filled) + '-'.repeat(10 - filled) + '] ' + Math.round(used_pct) + '%');
}
if (!isNaN(input_tok) && !isNaN(ctx_size)) {
  out.push('TOK:' + (input_tok / 1000).toFixed(1) + 'k/' + (ctx_size / 1000).toFixed(0) + 'k');
}
if (!isNaN(remaining)) {
  out.push('REM:' + Math.round(remaining) + '% left');
}
if (!isNaN(week_pct)) {
  out.push('WEEK:7d:' + Math.round(week_pct) + '%');
}

process.stdout.write(out.join('\n'));
JSEOF
)

bar="" tok="" rem="" week=""
while IFS= read -r line; do
  case "$line" in
    BAR:*)  bar="${line#BAR:}" ;;
    TOK:*)  tok="${line#TOK:}" ;;
    REM:*)  rem="${line#REM:}" ;;
    WEEK:*) week="${line#WEEK:}" ;;
  esac
done <<< "$computed"

# Caveman badge — populated by caveman hooks when active
caveman_text=""
caveman_flag="$HOME/.claude/.caveman-active"
if [ -f "$caveman_flag" ]; then
  caveman_mode=$(cat "$caveman_flag" 2>/dev/null)
  if [ "$caveman_mode" = "full" ] || [ -z "$caveman_mode" ]; then
    caveman_text=$'\033[38;5;172m[CAVEMAN]\033[0m'
  else
    caveman_suffix=$(echo "$caveman_mode" | tr '[:lower:]' '[:upper:]')
    caveman_text=$'\033[38;5;172m[CAVEMAN:'"${caveman_suffix}"$']\033[0m'
  fi
fi

# Assemble
parts=()
[ -n "$caveman_text" ] && parts+=("$caveman_text")
[ -n "$project" ]      && parts+=("$project")
[ -n "$branch" ]       && parts+=("($branch)")
[ -n "$model" ]        && parts+=("| $model")
[ -n "$bar" ]          && parts+=("| ctx: $bar")
[ -n "$tok" ]          && parts+=("$tok")
[ -n "$rem" ]          && parts+=("$rem")
[ -n "$week" ]         && parts+=("| $week")

printf "%s\n" "${parts[*]}"
