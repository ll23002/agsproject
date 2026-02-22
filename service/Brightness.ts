import GObject from "gi://GObject";
import { execAsync } from "ags/process";
import Gio from "gi://Gio";

class BrightnessService extends GObject.Object {
    static {
        GObject.registerClass({
            GTypeName: "BrightnessService",
            Properties: {
                "screen": GObject.ParamSpec.float(
                    "screen", "Screen", "Screen brightness",
                    GObject.ParamFlags.READWRITE,
                    0, 1, 1
                ),
            },
        }, this);
    }

    #screen = 1;
    #max = 0;
    #path = "";
    #monitor: any = null;

    get screen() { return this.#screen; }
    
    set screen(percent) {
        if (percent < 0) percent = 0;
        if (percent > 1) percent = 1;


        execAsync(`brightnessctl s ${Math.ceil(percent * 100)}% -q`).then(() => {
            this.#screen = percent;
            this.notify("screen");
        }).catch(console.error);
    }

    constructor() {
        super();
        this.#init().catch(console.error);
    }

    async #init() {
        try {
            const out = await execAsync("sh -c 'ls -w1 /sys/class/backlight | head -1'");
            const device = out.trim();
            if (!device) return;

            this.#path = `/sys/class/backlight/${device}/brightness`;
            const maxStr = await execAsync("brightnessctl m");
            this.#max = Number(maxStr);
            
            await this.#update();

            const file = Gio.File.new_for_path(this.#path);
            this.#monitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
            this.#monitor.connect("changed", () => this.#update());
        } catch (error) {
            console.error("Error initializing Brightness service:", error);
        }
    }

    async #update() {
        if (!this.#max) return;
        try {
            const currentStr = await execAsync("brightnessctl g");
            const raw = Number(currentStr);
            const percent = raw / this.#max;
            
            // Round to 2 decimal places to prevent float precision spam
            const rounded = Math.round(percent * 100) / 100;
            
            if (this.#screen !== rounded) {
                this.#screen = rounded;
                this.notify("screen");
            }
        } catch (error) {
            console.error("Error updating Brightness:", error);
        }
    }
}

export default new BrightnessService();
