import GObject from "gi://GObject";
import { execAsync } from "ags/process";
import GLib from "gi://GLib";
import Gio from "gi://Gio";

class KbdBrightnessService extends GObject.Object {
    static {
        GObject.registerClass({
            GTypeName: "KbdBrightnessService",
            Properties: {
                "kbd": GObject.ParamSpec.float(
                    "kbd", "Kbd", "Keyboard brightness",
                    GObject.ParamFlags.READWRITE,
                    0, 1, 1
                ),
            },
        }, this);
    }

    #kbd = 0;
    #max = 0;
    #path = "";
    #monitor: any = null;

    get kbd() { return this.#kbd; }
    
    set kbd(percent) {
        if (percent < 0) percent = 0;
        if (percent > 1) percent = 1;
        execAsync(`brightnessctl -d tpacpi::kbd_backlight s ${Math.ceil(percent * 100)}% -q`).then(() => {
            this.#kbd = percent;
            this.notify("kbd");
        }).catch(console.error);
    }

    constructor() {
        super();
        this.#init();
    }

    async #init() {
        try {
            const device = "tpacpi::kbd_backlight";

            this.#path = `/sys/class/leds/${device}/brightness`;
            const maxStr = await execAsync(`brightnessctl -d ${device} m`);
            this.#max = Number(maxStr);
            
            await this.#update();

            // ACPI changes to kbd_backlight by EC do NOT trigger inotify/Gio.FileMonitor.
            // We MUST poll it.
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
                this.#update();
                return GLib.SOURCE_CONTINUE;
            });
        } catch (error) {
            console.error("Error initializing KbdBrightness service:", error);
        }
    }

    async #update() {
        if (!this.#max) return;
        try {
            // Read file directly (much cheaper than spawning brightnessctl every 250ms)
            const currentStr = await execAsync(`cat ${this.#path}`);
            const raw = Number(currentStr.trim());
            const percent = raw / this.#max;
            
            // Round to 2 decimal places to prevent float precision spam
            const rounded = Math.round(percent * 100) / 100;
            
            if (this.#kbd !== rounded) {
                this.#kbd = rounded;
                this.notify("kbd");
            }
        } catch (error) {
            // Ignore temporary read errors
        }
    }
}

export const kbdBrightnessService = new KbdBrightnessService();
export default kbdBrightnessService;
