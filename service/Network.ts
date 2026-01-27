import GObject from "gi://GObject";
import GLib from "gi://GLib";

class NetworkService extends GObject.Object {
    static {
        GObject.registerClass({
            Properties: {
                'down': GObject.ParamSpec.string(
                    'down', "Download Speed", "Download Speed formatted",
                    GObject.ParamFlags.READABLE,
                    "0 B/s"
                ),
                'up': GObject.ParamSpec.string(
                    'up', 'Upload Speed', 'Upload Speed formatted',
                    GObject.ParamFlags.READABLE,
                    "0 B/s"
                ),
            },
        }, this);
    }

    #down = "0 B/s";
    #up = "0 B/s";
    #prevDown = 0;
    #prevUp = 0;
    #lastTime = 0;

    constructor() {
        super();
        this.#update();

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
            this.#update();
            return true;
        });
    }

    get down() { return this.#down; }
    get up() { return this.#up; }

    #formatSpeed(bytes: number) {
        if (bytes < 1024) return `${Math.round(bytes)} B/s`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
    }

    #update() {
        try {
            const file = GLib.file_get_contents("/proc/net/dev");
            if (!file[0]) return;

            const content = new TextDecoder().decode(file[1]);
            const lines = content.split("\n");
            const now = GLib.get_monotonic_time();

            let totalDown = 0;
            let totalUp = 0;

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.includes(":") && /^(e|w)/.test(trimmed)) {
                    const parts = trimmed.split(/\s+/);

                    const values = trimmed.split(":")[1]?.trim().split(/\s+/).map(Number);
                    if (values && values.length > 8) {
                        totalDown += values[0]; // bytes recibidos
                        totalUp += values[8];   // bytes transmitidos
                    }
                }
            }

            if (this.#lastTime === 0) {
                this.#prevDown = totalDown;
                this.#prevUp = totalUp;
                this.#lastTime = now;
                return;
            }

            const deltaTime = (now - this.#lastTime) / 1000000;

            const deltaDown = totalDown - this.#prevDown;
            const deltaUp = totalUp - this.#prevUp;

            const speedDown = deltaDown / deltaTime;
            const speedUp = deltaUp / deltaTime;

            this.#prevDown = totalDown;
            this.#prevUp = totalUp;
            this.#lastTime = now;

            if (deltaDown < 0 || deltaUp < 0) return;

            const newDown = this.#formatSpeed(speedDown);
            const newUp = this.#formatSpeed(speedUp);

            if (this.#down !== newDown) {
                this.#down = newDown;
                this.notify("down");
            }

            if (this.#up !== newUp) {
                this.#up = newUp;
                this.notify("up");
            }
        } catch (error) {
            console.error("Error leyendo red:", error);
        }
    }
}

const service = new NetworkService();
export default service;