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

    constructor() {
        super();

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            this.#update();
            return true;
        });
        this.#update();
    }

    get down() { return this.#down; }
    get up() { return this.#up; }

    #formatSpeed(bytes: number) {
        if (bytes < 1024) return `${bytes} B/s`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
    }


    #update() {
        try {
            const file = GLib.file_get_contents("/proc/net/dev");
            if (!file[0]) return;

            const content = new TextDecoder().decode(file[1]);
            const lines = content.split("\n");

            let totalDown = 0;
            let totalUp = 0;

            for (const line of lines) {
                if (line.includes(":") && !line.includes("lo:")) {
                    const parts = line.split(/\s+/).filter(Boolean);
                    const values = line.split(":")[1]?.trim().split(/\s+/).map(Number);
                    if (values && values.length > 8) {
                        totalDown += values[0];
                        totalUp += values[8];
                    }
                }
            }


            const downSpeed = totalDown - this.#prevDown;
            const upSpeed = totalUp - this.#prevUp;

            this.#prevDown = totalDown;
            this.#prevUp = totalUp;

            if (downSpeed < 0 || upSpeed < 0 || downSpeed > 1000000000) return;

            const newDown = this.#formatSpeed(downSpeed);
            const newUp = this.#formatSpeed(upSpeed);


            if (this.#down !== newDown) {
                this.#down = newDown;
                this.notify("down");
            }

            if (this.#up !== newUp) {
                this.#up = newUp;
                this.notify("up")
            }
        } catch (error) {
            console.error(error);
        }
    }
}

const service = new NetworkService();
export default service;