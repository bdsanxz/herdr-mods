#!/bin/sh
# Reports Qoder's state to Herdr (OSC 7501) so the terminal shows up as an agent.
# Usage: herdr-status.sh <idle|working|blocked|done>
state=${1:-idle}
payload=$(cat 2>/dev/null)
# Qoder also notifies when it just sits at the prompt; that is not waiting on the user.
[ "$state" = blocked ] && case "$payload" in *idle_prompt*) exit 0 ;; esac
# Hooks run without a controlling tty: walk up to the first ancestor that has one.
pid=$$
tty=
while [ -n "$pid" ] && [ "$pid" != 0 ] && [ "$pid" != 1 ]; do
  t=$(ps -o tty= -p "$pid" 2>/dev/null | tr -d ' ')
  case "$t" in ''|'?'|'??') ;; *) tty=/dev/$t; break ;; esac
  pid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')
done
[ -n "$tty" ] && [ -w "$tty" ] && printf '\033]7501;state=%s:app=qoder\033\\' "$state" >"$tty"
exit 0
