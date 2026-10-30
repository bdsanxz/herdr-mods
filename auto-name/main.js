// Auto name: gives every new unnamed tab (a new agent, terminal or space)
// a robot name like "Kryx". Tabs that exist when the mod starts, and
// tabs named on creation (tab.new --name), are left alone.
import { View, div } from "gpui-kit";
import { spaces, run } from "herdr";
import { robotName } from "./node_modules/@xzy-ai/robo-faker/dist/index.js";

const tabs = () => spaces().flatMap((s) => s.tabs ?? []);

export default class AutoName extends View {
  init(_props, cx) {
    this.seen = new Set(tabs().map((t) => t.id));
    cx.timer.every(1000, () => this.scan());
  }

  scan() {
    const all = tabs();
    const taken = new Set(all.map((t) => t.name));
    for (const t of all) {
      if (this.seen.has(t.id)) continue;
      this.seen.add(t.id);
      if (t.named === false || /^\d+$/.test(t.name)) {
        const name = robotName({ seed: t.id, taken });
        taken.add(name);
        run("tab.rename", { id: t.id, name });
      }
    }
  }

  render() {
    return div();
  }
}
