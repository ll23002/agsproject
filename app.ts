import app from "ags/gtk4/app"
import style from "./style.scss"
import Calendar from "./widget/Calendar";
import ControlPanel from "./widget/controlPanel"
import NotificationPopups from "./widget/NotificationPopups"
import Workspaces from "./widget/Workspaces";
import "./service/BarState";

app.start({
  css: style.toString().replace('@charset "UTF-8";', ""),
  //@ts-ignore
  requestHandler(request: string, res: (response: any) => void) {
    const cmd = String(request).replace(/\s+/g, "");

    if (cmd === "toggleBar" || cmd === "toggleBar()") {
      // @ts-ignore
      if (typeof globalThis.toggleBar === "function") {
        // @ts-ignore
        globalThis.toggleBar();
        res("OK: Bar toggled");
      } else {
        print("[ERROR] globalThis.toggleBar no existe. ¿Se cargó BarState?");
        res("ERROR: function not found");
      }
    } else {
      res(`ERROR: Unknown command. Limpio: '${cmd}'`);
    }
  },
  main() {

    app.get_monitors().map(monitor => {
      ControlPanel(monitor)
      Calendar(monitor)
      NotificationPopups(monitor)
      Workspaces(monitor)
    })
  },
})