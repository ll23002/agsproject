import GObject from "gi://GObject";
import GLib from "gi://GLib";
// @ts-ignore
import Network from "gi://AstalNetwork";

class NetworkService extends GObject.Object {
    static {
        GObject.registerClass({
            Properties: {
                'down': GObject.ParamSpec.string('down', 'Down', 'Down', GObject.ParamFlags.READABLE, "0 B/s"),
                'up': GObject.ParamSpec.string('up', 'Up', 'Up', GObject.ParamFlags.READABLE, "0 B/s"),
            },
        }, this);
    }

    #network = Network.get_default();
    #down = "0 B/s";
    #up = "0 B/s";
    #prevDown = 0;
    #prevUp = 0;
    #lastTime = 0;
    #decoder = new TextDecoder();

    constructor() {
        super();
        this.#update();

        GLib.timeout_add(GLib.PRIORITY_LOW, 2000, () => {
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

    #getIfaceName(active: any): string | null {
        return active?.device?.get_iface?.() ?? null;
    }

    #update() {
        try {
            const active = this.#network.wifi || this.#network.wired;
            if (!active) return;

            const interfaceName = this.#getIfaceName(active);
            if (!interfaceName) return;

            const [ok, fileContent] = GLib.file_get_contents("/proc/net/dev");
            if (!ok) return;

            const lines = this.#decoder.decode(fileContent).split("\n");

            const deviceLine = lines.find(l => l.trim().startsWith(`${interfaceName}:`));
            if (deviceLine) {
                this.#calculateSpeeds(deviceLine);
            }
        } catch (error) {
            console.error(error);
        }
    }

    #calculateSpeeds(line: string) {
        const stats = line.split(":")[1].trim().split(/\s+/).map(Number);
        const totalDown = stats[0];
        const totalUp = stats[8];
        const now = GLib.get_monotonic_time();

        if (this.#lastTime !== 0) {
            const deltaTime = (now - this.#lastTime) / 1000000;

            if (deltaTime > 0) {
                const speedDown = (totalDown - this.#prevDown) / deltaTime;
                const speedUp = (totalUp - this.#prevUp) / deltaTime;

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
            }
        }

        this.#prevDown = totalDown;
        this.#prevUp = totalUp;
        this.#lastTime = now;
    }
}

const service = new NetworkService();
export default service;