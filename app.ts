import app from "ags/gtk4/app"
import style from "./style.scss"
import Bar from "./widget/Bar"
import Calendar from "./widget/Calendar";
import ControlPanel from "./widget/controlPanel"

app.start({
  css: style,
  main() {
    app.get_monitors().map(ControlPanel)
  },
})
