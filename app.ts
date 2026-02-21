import app from "ags/gtk4/app"
//@ts-ignore
import style from "./styles/main.scss"
import NotificationPopups from "./widget/notifications/NotificationPopups"
import "./service/BarState";
import Bar from "./widget/bar/Bar";
import ProyectionMenu from "./widget/menus/ProyectionMenu";
import WorkspaceCarousel from "./widget/menus/WorkspaceCarousel";
import ChargingOverlay from "./widget/osd/ChargingOverlay";
import CheatSheet from "./widget/menus/help";
import OSD from "./widget/osd/OSD";
import WifiDetailsWindow from "./widget/control-panel/WifiDetailsWindow";

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
      CheatSheet(monitor)
      OSD(monitor)
      WifiDetailsWindow(monitor)
    })

    ChargingOverlay()

  },
})