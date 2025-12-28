import { Astal, Gtk, Gdk } from "ags/gtk4";
import app from "ags/gtk4/app";
import { setHover } from "./BarState";

export default function TopHover(gdkmonitor: Gdk.Monitor) {
    const { TOP, LEFT, RIGHT } = Astal.WindowAnchor;

    // 1. Creamos la caja MANUALMENTE
    // Le damos hexpand/vexpand para asegurar que llene la ventana invisible
    const sensorBox = new Gtk.Box({
        hexpand: true,
        vexpand: true,
    });

    // 2. Inyectamos el controlador de movimiento
    const controller = new Gtk.EventControllerMotion();
    controller.connect("enter", () => setHover(true));
    controller.connect("leave", () => setHover(false));
    sensorBox.add_controller(controller);

    // 3. Retornamos la ventana con la caja dentro
    return <window
        visible
        name="hover-zone"
        // Layer TOP para estar arriba de ventanas normales pero debajo de menús fullscreen
        layer={Astal.Layer.TOP}
        exclusivity={Astal.Exclusivity.IGNORE} // No empuja nada
        anchor={TOP | LEFT | RIGHT}
        heightRequest={10} // Altura del área sensible (10px)
        application={app}
        gdkmonitor={gdkmonitor}
        css="background-color: transparent;" // Invisible
    >
        {sensorBox}
    </window>
}