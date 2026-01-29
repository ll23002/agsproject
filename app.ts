import app from "ags/gtk4/app"
import style from "./style.scss"
import NotificationPopups from "./widget/NotificationPopups"
import "./service/BarState";
import Bar from "./widget/Bar";
import ProyectionMenu from "./widget/ProyectionMenu";

app.start({
  css: style.toString().replace('@charset "UTF-8";', ""),
  //@ts-ignore
  requestHandler(request: string, res: (response: any) => void) {
    const command = String(request || "").trim();
    if (command === "toggleBar") {
      console.log("Si estoy enviando el dato correcto")
      // @ts-ignore
      globalThis.toggleBar();
      res("Barra alternada correctamente, genio.");
    } else {
      res(`Error: El comando '${command}' no existe en mi limitado universo.`);
    }
  },
  main() {

    app.get_monitors().map(monitor => {
      Bar(monitor)
      NotificationPopups(monitor)
      ProyectionMenu(monitor)
    })
  },
})