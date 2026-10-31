# Integrations

Agents that don't report their state to Herdr (OSC 7501) show up as plain terminals.
These small adapters make them appear in the agents list with their status
(`idle`, `working`, `blocked`, `done`).

## OpenCode v2

Copy `opencode/tui.js` to `~/.config/opencode/herdr-status/tui.js` and add it to
`~/.config/opencode/cli.json`:

```json
{ "plugins": ["/Users/<you>/.config/opencode/herdr-status"] }
```

## Qoder CLI

Copy `qoder/herdr-status.sh` to `~/.qoder/hooks/` (`chmod +x`) and add to `~/.qoder/settings.json`:

```json
"hooks": {
  "SessionStart":     [{"hooks":[{"type":"command","command":"~/.qoder/hooks/herdr-status.sh idle"}]}],
  "UserPromptSubmit": [{"hooks":[{"type":"command","command":"~/.qoder/hooks/herdr-status.sh working"}]}],
  "PostToolUse":      [{"hooks":[{"type":"command","command":"~/.qoder/hooks/herdr-status.sh working"}]}],
  "Notification":     [{"hooks":[{"type":"command","command":"~/.qoder/hooks/herdr-status.sh blocked"}]}],
  "Stop":             [{"hooks":[{"type":"command","command":"~/.qoder/hooks/herdr-status.sh done"}]}],
  "SessionEnd":       [{"hooks":[{"type":"command","command":"~/.qoder/hooks/herdr-status.sh idle"}]}]
}
```

Restart running agents afterwards.
