# herdr-mods

Mods for the Herdr desktop app, written in gpui-kit JavaScript.

| Mod | What it does |
| --- | --- |
| `auto-name` | Gives every new, unnamed tab a short robotic name (Zyro, Kryx, Vexi…) using `@xzy-ai/robo-faker`, avoiding names already taken. |
| `titlebar-git` | An empty 38px header band that sits behind the macOS traffic-light buttons. |

Copy a folder into `~/.config/herdr-app/mods/` and run `herdr-app check <mod>`.
`auto-name` installs its dependency from `vendor/`: run `npm install` inside it.

## License

Apache License 2.0. See [LICENSE](LICENSE).
