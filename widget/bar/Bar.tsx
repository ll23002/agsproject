import app from "ags/gtk4/app"
import {Astal, Gdk, Gtk} from "ags/gtk4"
import {Workspaces} from "./Workspaces";
import {Calendar} from "./Calendar";
import {ControlPanel} from "../control-panel/controlPanel";
import {SysTray} from "./SysTray";

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
            <box css="padding: 4px 12px; margin-top: 4px;">
                <box halign={Gtk.Align.START} hexpand>
                    <Workspaces />
                </box>
                
                <box halign={Gtk.Align.CENTER} hexpand>
                    <Calendar />
                </box>
                
                <box halign={Gtk.Align.END} hexpand spacing={12}>
                    <SysTray />
                    <ControlPanel />
                </box>
            </box>
        </window>
    )
}