import { Astal, Gtk, Gdk } from "ags/gtk4";
import { createBinding } from "ags";
import { execAsync } from "ags/process";
import app from "ags/gtk4/app";
import GObject from "gi://GObject";

class ProjectionService extends GObject.Object {
    static {
        GObject.registerClass({
            Properties: {
                'mode': GObject.ParamSpec.int(
                    'mode', 'Mode', 'Selected mode index',
                    GObject.ParamFlags.READWRITE,
                    0, 3, 1
                ),
            },
        }, this);
    }

    declare mode: number;

    cycle(step: number) {
        let next = this.mode + step;
        if (next > 3) next = 0;
        if (next < 0) next = 3;
        this.mode = next;
    }

    async applyMode() {
        const m = this.mode;
        console.log(`Aplicando modo de proyección: ${m}`);

        try {
            switch (m) {
                case 0: // Solo PC
                    await execAsync(`hyprctl keyword monitor "HDMI-A-1, disable"`);
                    await execAsync(`hyprctl keyword monitor "eDP-1, preferred, auto, 1"`);
                    break;
                case 1: // Duplicar
                    await execAsync(`hyprctl keyword monitor "eDP-1, preferred, auto, 1"`);
                    await execAsync(`hyprctl keyword monitor "HDMI-A-1, preferred, auto, 1, mirror, eDP-1"`);
                    break;
                case 2: // Extender
                    await execAsync(`hyprctl keyword monitor "eDP-1, preferred, auto, 1"`);
                    await execAsync(`hyprctl keyword monitor "HDMI-A-1, preferred, auto, 1, transform, 0"`);
                    break;
                case 3: // Solo Proyector
                    await execAsync(`hyprctl keyword monitor "eDP-1, disable"`);
                    await execAsync(`hyprctl keyword monitor "HDMI-A-1, preferred, auto, 1"`);
                    break;
            }
        } catch (e) {
            console.error("Error cambiando proyección:", e);
        }
    }
}

const service = new ProjectionService();

export default function ProjectionMenu(gdkmonitor: Gdk.Monitor) {
    const modeBinding = createBinding(service, "mode");

    const options = [
        { icon: "\u{f0322}", label: "Solo PC" },
        { icon: "\u{f037a}", label: "Duplicar" },
        { icon: "\u{f1928}", label: "Extender" },
        { icon: "\u{f042e}", label: "Solo Proyector" },
    ];

    const hide = () => app.toggle_window("projection-menu");

    const keyController = new Gtk.EventControllerKey();

    keyController.connect("key-pressed", (_: Gtk.EventControllerKey, keyval: number) => {
        if (keyval === Gdk.KEY_Escape) {
            hide();
            return true;
        }
        if (keyval === Gdk.KEY_Left || keyval === Gdk.KEY_Up) {
            service.cycle(-1);
            return true;
        }
        if (keyval === Gdk.KEY_Right || keyval === Gdk.KEY_Down) {
            service.cycle(1);
            return true;
        }
        if (keyval === Gdk.KEY_Return || keyval === Gdk.KEY_space) {
            service.applyMode().catch(console.error);
            hide();
            return true;
        }
        return false;
    });

    const win = (
        <window
            name="projection-menu"
            visible={false}
            gdkmonitor={gdkmonitor}
            anchor={Astal.WindowAnchor.BOTTOM}
            exclusivity={Astal.Exclusivity.IGNORE}
            keymode={Astal.Keymode.EXCLUSIVE}
            layer={Astal.Layer.OVERLAY}
            application={app}
            css="background-color: transparent;"
        >
            <box
                class="projection-widget"
                spacing={20}
                orientation={Gtk.Orientation.HORIZONTAL}
            >
                {options.map((opt, index) => (
                    <button
                        class={modeBinding(m => m === index ? "option active" : "option")}
                        focusable={false}
                        onClicked={() => {
                            service.mode = index;
                            service.applyMode().catch(console.error);
                            hide();
                        }}
                    >
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
                            <label
                                label={opt.icon}
                                css="font-size: 64px;"
                            />
                            <label label={opt.label} />
                        </box>
                    </button>
                ))}
            </box>
        </window>
    ) as Astal.Window;

    win.add_controller(keyController);

    return win;
}