import GObject from "gi://GObject"
import GLib from "gi://GLib"
//@ts-ignore
import Battery from "gi://AstalBattery"


class PowerProfilesService extends GObject.Object {
    static {
        GObject.registerClass({
            Signals: {
                "changed": {},
            },
        }, this);
    }

    _profile = "balanced";

    constructor() {
        super();

        this._sync();

        const bat = Battery.get_default();

        bat.connect("notify::charging", () => this._autoSwitch(bat));

        this._autoSwitch(bat);
    }

    get profile() {
        return this._profile;
    }


    _sync() {
        try {
            const [success, stdout, stderr, exit_status] = GLib.spawn_command_line_sync("powerprofilesctl get");
            if (success) {
                const decoder = new TextDecoder();
                //@ts-ignore
                const current = decoder.decode(stdout).trim();

                if (this._profile !== current) {
                    this._profile = current;
                    this.emit("changed");
                }
            }
        } catch (e) {
            console.error("Error leyendo perfil de energía:", e);
        }
    }


    setProfile(mode: string) {
        GLib.spawn_command_line_async(`powerprofilesctl set ${mode}`);

        this._profile = mode;
        this.emit("changed");
        print(`⚡ Perfil cambiado a: ${mode}`);
    }

    _autoSwitch(bat: any) {
        if (bat.charging) {
            if (this._profile !== "performance") {
                this.setProfile("performance");
            }
        } else {
            if (this._profile !== "balanced") {
                this.setProfile("balanced");
            }
        }
    }
}


const service = new PowerProfilesService();
export default service;