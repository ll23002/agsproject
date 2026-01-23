import app from "ags/gtk4/app"
import style from "./style.scss"
import Calendar from "./widget/Calendar";
import ControlPanel from "./widget/controlPanel"
import NotificationPopups from "./widget/NotificationPopups"
// @ts-ignore
import Hyprland from "gi://AstalHyprland";
import Workspaces from "./widget/Workspaces";
import "./service/BarState";

app.start({
  css: style.toString().replace('@charset "UTF-8";', ""),
  //@ts-ignore
  requestHandler(request: string, res: (response: any) => void) {
    // 1. Forzamos conversión a String (por si acaso llega como objeto GString)
    // 2. Usamos replace regex para borrar espacios y saltos de línea (\n, \r, espacio)
    const cmd = String(request).replace(/\s+/g, "");

    // DEBUG: Usamos JSON.stringify para ver los caracteres invisibles en la consola
    print(`[DEBUG] Recibido crudo: ${JSON.stringify(request)}`);
    print(`[DEBUG] Procesado: '${cmd}'`);

    // Ahora comparamos contra la versión limpia
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