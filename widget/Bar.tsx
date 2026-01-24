import app from "ags/gtk4/app"
import {Astal, Gtk, Gdk} from "ags/gtk4"
import {showWidget} from "../service/BarState";

// Importamos los widgets transformados
import {Workspaces} from "./Workspaces";
import {Calendar} from "./Calendar";
import {ControlPanel} from "./controlPanel";

export default function Bar(gdkmonitor: Gdk.Monitor) {
    const {TOP, LEFT, RIGHT} = Astal.WindowAnchor

    return (
        <window
            visible

            name="bar"
            namespace="bar"
            class="Bar"
            gdkmonitor={gdkmonitor}
            exclusivity={Astal.Exclusivity.EXCLUSIVE}
            layer={Astal.Layer.TOP}

            anchor={TOP | LEFT | RIGHT}

            application={app}
            css="background-color: transparent;"
        >
            <box
                homogeneous={true}>
                <Workspaces />
                <Calendar />
                <ControlPanel />

            </box>
        </window>
    )
}