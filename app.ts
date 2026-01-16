import app from "ags/gtk4/app"
import style from "./style.scss"
import Calendar from "./widget/Calendar";
import ControlPanel from "./widget/controlPanel"
import TopHover from "./widget/TopHover"
import NotificationPopups from "./widget/NotificationPopups"
// @ts-ignore
import Hyprland from "gi://AstalHyprland";

app.start({
  css: style.toString().replace('@charset "UTF-8";', ""),
  main() {
    const hypr = Hyprland.get_default();

    hypr.connect("notify::focused-client", () => {
      const cliente = hypr.focusedClient;
    });

    app.get_monitors().map(monitor => {
      ControlPanel(monitor)
      Calendar(monitor)
      TopHover(monitor)
      NotificationPopups(monitor)
    })
  },
})