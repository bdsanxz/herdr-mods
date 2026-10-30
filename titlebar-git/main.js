// Titlebar: an empty drag strip that holds macOS's native window buttons.
import { View } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme } from "herdr";

export default class TitlebarGit extends View {
  render() {
    const t = theme();
    return h_flex().size_full().bg(t.chrome).border_b(1).border_color(t.border);
  }
}
