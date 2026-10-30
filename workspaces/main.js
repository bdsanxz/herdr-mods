// Workspaces: spaces and agents in one menu. Each space is a group and the
// agents living in it sit indented underneath, so an agent is always seen
// under its space. Sub-agents hang under their parent agent. A space whose
// folder lies under another space's folder (same machine) nests as its child.
import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, panes, agents, terminals, run, openOverlay, theme, shared, setShared, setAgentOrder } from "herdr";

const PALETTE = ["ansi6", "ansi3", "ansi4", "ansi5", "ansi2", "ansi1"];
const MARK = { ansi6: "#22a99a", ansi3: "#e3814f", ansi4: "#5b8def", ansi5: "#8b7cf6", ansi2: "#3fae6a", ansi1: "#d9649a" };

function glyph(status) {
  return status === "blocked" || status === "done" ? "●" : "·";
}
function tone(t, status) {
  return t[status] ?? t.unknown;
}
function icon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}
const kidStatus = (k, listed) => {
  const s = listed.get(k.address) ?? k.status;
  return s === "error" ? "blocked" : s === "done" ? "idle" : s;
};

const trim = (f) => (f && f.length > 1 ? f.replace(/\/+$/, "") : f);

// Nearest enclosing space of `s` by folder, or null.
function parentSpace(s, sp, where) {
  const f = trim(where.get(s.id));
  if (!f) return null;
  let best = null;
  for (const o of sp) {
    const of = trim(where.get(o.id));
    if (o.id === s.id || !of || (o.machine ?? null) !== (s.machine ?? null)) continue;
    const under = f !== of && f.startsWith(of.endsWith("/") ? of : of + "/");
    if (under && (!best || trim(where.get(best.id)).length < of.length)) best = o;
  }
  return best;
}

export default class Workspaces extends View {
  init() {
    this.folded = new Set();
    this.pressed = null;
    this.over = null;
  }

  // Live sub-agents of `addr`, depth first.
  tree(all, addr) {
    const kids = all.filter((k) => k.parent === addr && k.state === "live");
    return kids.flatMap((k) => [{ t: k }, ...this.tree(all, k.address)]);
  }

  dot(t, status) {
    if (status === "working") return svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900);
    if (status === "blocked") return div().size(14).flex_none().rounded(4).bg(t.blocked + "26").text_size(10.5).font_bold().text_color(t.blocked).flex().items_center().justify_center().child("!");
    if (status === "idle") return div().size(7).mx(3).flex_none().rounded(4).border(1.5).border_color(t.idle ?? t.dim);
    return div().size(7).mx(3).flex_none().rounded(4).bg(t[status] ?? t.unknown);
  }

  menu(s) {
    openOverlay({ mod: "menu", kind: "popup", width: 200, height: 260, props: { tab: "space", target: { id: s.id } } });
  }

  agentName(a, tabs) {
    const tab = tabs.find((x) => x.id === a.tab);
    const name = tab ? tab.name : a.tab_name;
    if ((tab?.named || (name && !/^\d+$/.test(name))) && name) return name;
    const prog = a.program?.name;
    const live = (a.title || "").trim();
    const telling = live && live !== prog && !/^[~/]|^[A-Za-z]:\\/.test(live) && !live.includes("@");
    return telling ? live : (prog ?? name ?? "");
  }

  spaceRow(s, i, t, fill, collapsed, hasAgents) {
    const on = s.active;
    if (collapsed) {
      return h_flex().id(`ws-${s.id}`).h(26).flex_none().justify_center().gap(4)
        .when(on, (el) => el.bg(t.raised)).hover((x) => x.bg(t.hover))
        .on_click(() => run("space.select", { id: s.id }))
        .child(div().text_color(on ? t.foreground : t.muted).child(String(i + 1)))
        .child(div().text_color(tone(t, s.status)).child(glyph(s.status)));
    }
    const open = !this.folded.has(s.id);
    return h_flex().id(`ws-${s.id}`).h(36).flex_none().px(10).gap(10).items_center().rounded(8)
      .when(on, (el) => el.bg(t.selected))
      .when(!on, (el) => el.hover((x) => x.bg(t.hover)))
      .when(this.pressed !== null && this.over === i && this.pressed !== i, (el) => el.border_t(2).border_color(t.accent))
      .on_mouse_down("left", (e) => {
        this.pressed = i;
        if (e.click_count === 2) run("space.rename", { id: s.id });
      })
      .on_mouse_up("left", (_e, cx) => {
        const from = this.pressed;
        this.pressed = null; this.over = null;
        if (from !== null && from !== i) run("space.move", { id: spaces()[from].id, index: i + 1 });
        else run("space.select", { id: s.id });
        cx.notify();
      })
      .on_mouse_down("right", () => this.menu(s))
      .child(h_flex().size(18).flex_none().rounded(5).bg(fill).items_center().justify_center().text_size(10.5).font_bold().text_color("#ffffff").child(s.name[0]?.toUpperCase() ?? "?"))
      .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(s.name))
      .when(Boolean(s.branch), (el) => el.child(div().max_w(90).min_w(0).truncate().text_size(11).text_color(t.dim).child(s.branch)))
      .when(Boolean(s.machine), (el) => el.child(div().text_size(10).text_color(t.dim).child(s.machine)))
      .when(Boolean(s.status), (el) => el.child(div().w(16).flex_none().flex().items_center().justify_center().text_size(12).text_color(tone(t, s.status)).child(glyph(s.status))))
      .when(hasAgents, (el) => el.child(div().id(`ws-fold-${s.id}`).size(18).flex_none().flex().items_center().justify_center().rounded(4).text_color(t.dim)
        .hover((x) => x.bg(t.hover).text_color(t.foreground))
        .on_click((_e, cx) => {
          cx.stop_propagation();
          open ? this.folded.add(s.id) : this.folded.delete(s.id);
          cx.notify();
        })
        .child(svg(`mods/workspace-chrome/chevron-${open ? "down" : "right"}.svg`).size(12))))
      .when(!hasAgents, (el) => el.child(div().size(18).flex_none()));
  }

  agentRow(a, t, name) {
    const idle = a.status === "idle" && !a.focused;
    const machine = a.address.includes("/") ? a.address.split("/")[0] : null;
    const pic = icon(a.program, 15, idle ? t.muted : t.foreground);
    return h_flex().id(`ws-ag-${a.address}`).h(32).flex_none().pl(36).pr(10).gap(10).items_center().rounded(7)
      .when(a.focused, (el) => el.bg(t.selected))
      .cursor_pointer().hover((x) => x.bg(t.hover))
      .on_click(() => run("pane.focus", { pane: a.pane }))
      .child(div().w(18).flex_none().flex().items_center().justify_center().child(pic ?? div().size(14).flex_none()))
      .child(div().flex_1().min_w(0).truncate().text_size(12.5).text_color(idle ? t.muted : t.foreground).child(name))
      .when(Boolean(machine), (el) => el.child(div().text_size(10).text_color(t.dim).child(machine)))
      .child(div().w(18).flex_none().flex().items_center().justify_center().child(this.dot(t, a.status)));
  }

  subRow(k, t, st) {
    const pic = icon(k.program, 13, t.muted);
    return h_flex().id(`ws-sub-${k.address}`).h(30).flex_none().pl(58).pr(10).gap(8).items_center().rounded(7)
      .cursor_pointer().hover((x) => x.bg(t.hover))
      .on_click(() => run("terminal.peek", { terminal: k.address }))
      .child(div().w(18).flex_none().flex().items_center().justify_center().child(pic ?? div().size(12).flex_none()))
      .child(div().flex_1().min_w(0).truncate().text_size(12).text_color(t.muted).child(k.name || k.template || k.program?.name || k.address))
      .child(div().w(18).flex_none().flex().items_center().justify_center().child(this.dot(t, st)));
  }

  render() {
    const t = theme();
    const collapsed = shared("sidebar.collapsed") === true;
    const sp = spaces();
    const ids = new Set(sp.map((p) => p.id));
    const kept = Object.fromEntries(Object.entries(shared("space.colors") ?? {}).filter(([id]) => ids.has(id)));
    let changed = Object.keys(kept).length !== Object.keys(shared("space.colors") ?? {}).length;
    for (const p of sp) {
      if (kept[p.id] || p.name === "~") continue;
      const uses = (c) => Object.values(kept).filter((v) => v === c).length;
      kept[p.id] = PALETTE.reduce((best, c) => (uses(c) < uses(best) ? c : best));
      changed = true;
    }
    if (changed) setShared("space.colors", kept);

    const list = agents();
    const listed = new Map(list.map((a) => [a.address, a.status]));
    const all = terminals();
    const tabs = sp.flatMap((s) => s.tabs ?? []);
    const bySpace = new Map(sp.map((s) => [s.id, []]));
    for (const a of list) {
      if (!bySpace.has(a.space)) bySpace.set(a.space, []);
      bySpace.get(a.space).push(a);
    }
    setAgentOrder([...bySpace.values()].flat().map((a) => a.address));

    // A space is where its first terminal is now, else where it was made.
    const where = new Map(sp.map((s) => [s.id, panes().find((p) => p.cwd && (s.tabs ?? []).some((x) => x.id === p.tab))?.cwd ?? s.folder]));
    const kids = new Map(sp.map((s) => [s.id, []]));
    const roots = [];
    sp.forEach((s, i) => {
      const par = collapsed ? null : parentSpace(s, sp, where);
      (par ? kids.get(par.id) : roots).push(i);
    });

    const rows = [];
    const place = (i, depth) => {
      const s = sp[i];
      const mine = bySpace.get(s.id) ?? [];
      const subs = kids.get(s.id);
      const fill = MARK[kept[s.id]] ?? t.accent;
      const group = [this.spaceRow(s, i, t, fill, collapsed, mine.length > 0 || subs.length > 0)];
      if (!collapsed && !this.folded.has(s.id)) {
        for (const a of mine) {
          group.push(this.agentRow(a, t, this.agentName(a, tabs)));
          for (const sub of this.tree(all, a.address)) group.push(this.subRow(sub.t, t, kidStatus(sub.t, listed)));
        }
      }
      rows.push(v_flex().gap(2).pb(depth ? 2 : 6).pl(depth * 14).children(group));
      if (!this.folded.has(s.id)) for (const c of subs) place(c, depth + 1);
    };
    roots.forEach((i) => place(i, 0));

    return v_flex().size_full().min_h(0).bg(t.chrome).text_size(13)
      .child(h_flex().h(38).pl(16).pr(10).flex_none().items_center().justify_between().text_size(11.5).text_color(t.dim)
        .when(!collapsed, (el) => el.child("Workspaces"))
        .child(div().id("ws-new").p(4).rounded(5).hover((x) => x.bg(t.hover).text_color(t.foreground)).on_click(() => run("space.new")).child("+")))
      .child(v_flex().flex_1().min_h(0).px(collapsed ? 0 : 10).pb(12).overflow_y_scrollbar().mode("always")
        .on_mouse_up("left", (_e, cx) => { this.pressed = null; cx.notify(); })
        .children(rows))
      .child(h_flex().h(28).px(12).flex_none().items_center().justify_end()
        .when(collapsed, (el) => el.justify_center().px(0))
        .child(div().id("ws-collapse").text_size(13).text_color(t.dim)
          .hover((x) => x.text_color(t.foreground))
          .on_click(() => {
            const next = !collapsed;
            setShared("sidebar.collapsed", next);
            run("layout.resize", { id: "sidebar", px: next ? 44 : (shared("sidebar.width") ?? 240) });
          })
          .child(collapsed ? "»" : "")));
  }
}
