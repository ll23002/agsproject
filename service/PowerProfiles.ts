import GObject from "gi://GObject";
import { execAsync } from "ags/process";
//@ts-ignore
import Battery from "gi://AstalBattery";

class PowerProfilesService extends GObject.Object {
    static {
        GObject.registerClass({
            Properties: {
                'profile': GObject.ParamSpec.string(
                    'profile', 'Power Profile', 'Current Power Profile',
                    GObject.ParamFlags.READWRITE,
                    "balanced"
                ),
            },
        }, this);
    }

    #profile: string = "balanced";
    #battery = Battery.get_default();

    constructor() {
        super();

        this.#init().catch(e => console.error("Error inicializando PowerProfiles:", e));
        this.#battery.connect("notify::charging", () => this.#autoSwitch());
    }

    get profile() {
        return this.#profile;
    }

    set profile(value: string) {
        if (this.#profile !== value) {
            this.setProfile(value).catch(e => console.error("Error cambiando perfil:", e));
        }
    }

    async #init() {
        try {
            const stdout = await execAsync("powerprofilesctl get");
            const current = stdout.trim();

            if (this.#profile !== current) {
                this.#profile = current;
                this.notify("profile");
            }
        } catch (e) {
            console.error("Error inicializando PowerProfiles:", e);
        }
        this.#autoSwitch();
    }

    async setProfile(mode: string) {
        if (this.#profile === mode) return;

        const oldProfile = this.#profile;
        this.#profile = mode;
        this.notify("profile");

        try {
            await execAsync(`powerprofilesctl set ${mode}`);
        } catch (e) {
            console.error(`Error cambiando perfil a ${mode}:`, e);
            this.#profile = oldProfile;
            this.notify("profile");
        }
    }

    #autoSwitch() {
        const isCharging = this.#battery.charging;

        if (isCharging && this.#profile !== "performance") {
            this.setProfile("performance").catch(e => console.error("Error cambiando perfil:", e));
        } else if (!isCharging && this.#profile !== "balanced") {
            this.setProfile("balanced").catch(e => console.error("Error cambiando perfil:", e));
        }
    }
}

const service = new PowerProfilesService();
export default service;