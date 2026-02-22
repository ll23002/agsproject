import GObject from "gi://GObject";
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

        try {
            const value = Math.floor(percent * this.#max);
            const file = Gio.File.new_for_path(this.#path);
            file.replace_contents(
                new TextEncoder().encode(value.toString()),
                null,
                false,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null
            );
            this.#screen = percent;
            this.notify("screen");
        } catch (error) {
            console.error("Error setting brightness:", error);
        }
    }

    constructor() {
        super();
        this.#init().catch(console.error);
    }

    async #init() {
        try {
            const backlight = Gio.File.new_for_path("/sys/class/backlight");
            const enumerator = backlight.enumerate_children("standard::name", Gio.FileQueryInfoFlags.NONE, null);
            const info = enumerator.next_file(null);

            if (!info) return;

            const device = info.get_name();
            this.#path = `/sys/class/backlight/${device}/brightness`;
            const maxPath = `/sys/class/backlight/${device}/max_brightness`;

            const maxFile = Gio.File.new_for_path(maxPath);
            const [success, contents] = maxFile.load_contents(null);

            if (success) {
                this.#max = Number(new TextDecoder().decode(contents).trim());
            }


            
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
            const file = Gio.File.new_for_path(this.#path);
            const [success, contents] = file.load_contents(null);

            if (success) {
                const raw = Number(new TextDecoder().decode(contents).trim());
                const percent = raw / this.#max;
                const rounded = Math.round(percent * 100) / 100;

                if (this.#screen !== rounded) {
                    this.#screen = rounded;
                    this.notify("screen");
                }
            }

        } catch (error) {
            console.error("Error updating Brightness:", error);
        }
    }
}

export default new BrightnessService();
