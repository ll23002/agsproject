import { Astal, Gtk } from "ags/gtk4";
//@ts-ignore
import Battery from "gi://AstalBattery";
import { createBinding } from "ags";
import app from "ags/gtk4/app";
import GObject from "gi://GObject";
import GLib from "gi://GLib";

class OverlayState extends GObject.Object {
    static {
        GObject.registerClass({
            GTypeName: "OverlayState",
            Properties: {
                "visible": GObject.ParamSpec.boolean(
                    "visible", "Visible", "Overlay visibility",
                    GObject.ParamFlags.READWRITE,
                    false
                ),
            },
        }, this);
    }

    #visible = false;

    get visible() {
        return this.#visible;
    }

    set visible(value: boolean) {
        if (this.#visible !== value) {
            this.#visible = value;
            this.notify("visible");
        }
    }
}

export default function ChargingOverlay() {
    const bat = Battery.get_default();
    const overlayState = new OverlayState();
    const visibilityBinding = createBinding(overlayState, "visible");

    const win = <window
        name="charging-overlay"
        namespace="charging-overlay"
        class="charging-overlay-window"
        layer={Astal.Layer.OVERLAY}
        exclusivity={Astal.Exclusivity.IGNORE}
        keymode={Astal.Keymode.NONE}
        visible={false}
        anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
        application={app}>
        <box
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
            class="overlay-bg visible"
        >
            <revealer
                transitionType={Gtk.RevealerTransitionType.CROSSFADE}
                transitionDuration={500}
                revealChild={visibilityBinding(v => v)}
            >
                <box class="overlay-content">
                    <label label="󱐋" class="charging-icon" />
                </box>
            </revealer>
        </box>
    </window> as Astal.Window;

    bat.connect("notify::charging", () => {
        if (bat.charging) {
            win.visible = true;
            overlayState.visible = true;
            console.log("⚡ Overlay visible - cargando batería");

            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                overlayState.visible = false;
                return GLib.SOURCE_REMOVE;
            });

            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 700, () => {
                win.visible = false;
                console.log("✓ Overlay oculto - ventana cerrada");
                return GLib.SOURCE_REMOVE;
            });
        }
    });

    return win;
}