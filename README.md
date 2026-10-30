# herdr-mods

Mods for the Herdr desktop app, written in gpui-kit JavaScript.

| Mod | What it does |
| --- | --- |
| `auto-name` | Gives every new, unnamed tab a short robotic name (Zyro, Kryx, Vexi…) using `@xzy-ai/robo-faker`, avoiding names already taken. |
| `titlebar-git` | An empty 38px header band that sits behind the macOS traffic-light buttons. |
| `workspaces` | Sidebar menu listing spaces with their agents underneath; a space whose folder lies under another space's folder nests as its child. |

Copy a folder into `~/.config/herdr-app/mods/` and run `herdr-app check <mod>`.
`auto-name` installs its dependency from `vendor/`: run `npm install` inside it.

## License

Apache License 2.0. See [LICENSE](LICENSE).
