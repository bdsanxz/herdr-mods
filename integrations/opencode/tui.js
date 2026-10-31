// Reports OpenCode's state to Herdr (OSC 7501) so the terminal shows up as an agent.
import { Plugin } from "@opencode/plugin/tui"
import { openSync, writeSync, closeSync } from "node:fs"

const running = new Set() // sessions mid-run (sub-agent sessions count too)
const asking = new Set()  // permission requests waiting on the user
let last

function report(state) {
  if (state === last) return
  last = state
  try {
    const fd = openSync("/dev/tty", "w")
    writeSync(fd, `\x1b]7501;state=${state}:app=opencode\x1b\\`)
    closeSync(fd)
  } catch {}
}

const settle = (resting) => report(asking.size ? "blocked" : running.size ? "working" : resting)

export default Plugin.define({
  id: "herdr.status",
  setup(context) {
    report("idle")
    const stop = context.data.listen(({ details }) => {
      const { type, data } = details
      const id = data?.sessionID
      if (type === "session.execution.started") { running.add(id); settle("idle") }
      else if (type.startsWith("session.execution.")) {
        running.delete(id)
        settle(type.endsWith(".succeeded") ? "done" : type.endsWith(".failed") ? "error" : "idle")
      }
      else if (type === "permission.asked") { asking.add(data?.id); settle("idle") }
      else if (type === "permission.replied") { data?.id ? asking.delete(data.id) : asking.clear(); settle("idle") }
    })
    return () => { stop(); report("idle") }
  },
})
