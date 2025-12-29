import { Astal, Gtk, Gdk } from "ags/gtk4";
import app from "ags/gtk4/app";
import { setHover } from "./BarState";

export default function TopHover(gdkmonitor: Gdk.Monitor) {
    const { TOP, LEFT, RIGHT } = Astal.WindowAnchor;

    const sensorBox = new Gtk.Box({
        hexpand: true,
        vexpand: true,
    });

    const controller = new Gtk.EventControllerMotion();
    controller.connect("enter", () => setHover(true));
    controller.connect("leave", () => setHover(false));
    sensorBox.add_controller(controller);

    return <window
        visible
        name="hover-zone"
        layer={Astal.Layer.TOP}
        exclusivity={Astal.Exclusivity.IGNORE}
        anchor={TOP | LEFT | RIGHT}
        heightRequest={10}
        application={app}
        gdkmonitor={gdkmonitor}
        css="background-color: transparent;"
    >
        {sensorBox}
    </window>
}