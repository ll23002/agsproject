import app from "ags/gtk4/app"
//@ts-ignore
import style from "./style.scss"
import NotificationPopups from "./widget/NotificationPopups"
import "./service/BarState";
import Bar from "./widget/Bar";
import ProyectionMenu from "./widget/ProyectionMenu";
import WorkspaceCarousel from "./widget/WorkspaceCarousel";
import ChargingOverlay from "./widget/ChargingOverlay";

app.start({
  css: style.toString().replace('@charset "UTF-8";', ""),
  //@ts-ignore
  requestHandler(request: string, res: (response: any) => void) {
    // @ts-ignore
    globalThis.toggleBar();
  },
  main() {

    app.get_monitors().map(monitor => {
      Bar(monitor)
      NotificationPopups(monitor)
      ProyectionMenu(monitor)
      WorkspaceCarousel(monitor)
    })

    ChargingOverlay()

  },
})