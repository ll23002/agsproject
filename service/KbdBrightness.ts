import GObject from "gi://GObject";
import { execAsync } from "ags/process";
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
        this.#init().catch(console.error);
    }

    async #init() {
        try {
            const device = "tpacpi::kbd_backlight";

            this.#path = `/sys/class/leds/${device}/brightness`;
            const maxStr = await execAsync(`brightnessctl -d ${device} m`);
            this.#max = Number(maxStr);
            
            await this.update();

            Gio.bus_get(Gio.BusType.SYSTEM, null, (obj, res) => {
                try {
                    const connection = Gio.bus_get_finish(res);
                    connection.signal_subscribe(
                        null,
                        "org.freedesktop.UPower.KbdBacklight",
                        null,
                        null,
                        null,
                        Gio.DBusSignalFlags.NONE,
                        () => {
                            this.update();
                        }
                    );
                } catch (e) {
                    console.error("Failed to subscribe to UPower KbdBacklight D-Bus signals:", e);
                }
            });

        } catch (error) {
            console.error("Error initializing KbdBrightness service:", error);
        }
    }

    async update() {
        if (!this.#max || !this.#path) return;
        try {
            const file = Gio.File.new_for_path(this.#path);
            const [, contents] = await new Promise<[boolean, Uint8Array]>((resolve, reject) => {
                file.load_contents_async(null, (file, res) => {
                    try {
                        // @ts-ignore
                        resolve(file.load_contents_finish(res));
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            const currentStr = new TextDecoder("utf-8").decode(contents).trim();
            const raw = Number(currentStr);
            const percent = raw / this.#max;
            
            const rounded = Math.round(percent * 100) / 100;
            
            if (this.#kbd !== rounded) {
                this.#kbd = rounded;
                this.notify("kbd");
            }
        } catch (error) {
            console.error("Error updating keyboard brightness:", error);
        }
    }
}

export const kbdBrightnessService = new KbdBrightnessService();
export default kbdBrightnessService;
