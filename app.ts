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
    // @ts-ignore
    globalThis.toggleBar();
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