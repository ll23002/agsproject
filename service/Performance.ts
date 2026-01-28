import GObject from "gi://GObject";
import GLib from "gi://GLib";

class PerformanceService extends GObject.Object {
    static {
        GObject.registerClass({
            Properties: {
                'cpu': GObject.ParamSpec.double(
                    'cpu', 'CPU Usage', 'CPU Usage Percentage',
                    GObject.ParamFlags.READABLE,
                    0, 1, 0
                ),
                'ram': GObject.ParamSpec.double(
                    'ram', 'RAM Usage', 'RAM Usage Percentage',
                    GObject.ParamFlags.READABLE,
                    0, 1, 0
                ),
                'temp': GObject.ParamSpec.double(
                    'temp', 'Temperature', 'System Temperature',
                    GObject.ParamFlags.READABLE,
                    0, 100, 0
                ),
            },
        }, this);
    }

    #cpu = 0;
    #ram = 0;
    #temp = 0;
    #prevIdle = 0;
    #prevTotal = 0;

    constructor() {
        super();
        this.#update();

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
            this.#update();
            return true;
        });
    }

    get cpu() { return this.#cpu; }
    get ram() { return this.#ram; }
    get temp() { return this.#temp; }

    #update() {
        this.#updateCPU();
        this.#updateRAM();
        this.#updateTemp();
    }

    #updateCPU() {
        try {
            const file = GLib.file_get_contents("/proc/stat")[1];
            const text = new TextDecoder().decode(file);
            const lines = text.split("\n");

            const fields = lines[0].split(/\s+/);

            const idle = Number(fields[4]) + Number(fields[5]);
            let total = 0;
            for (let i = 1; i < fields.length; i++) {
                const n = Number(fields[i]);
                if (!isNaN(n)) total += n;
            }

            const diffIdle = idle - this.#prevIdle;
            const diffTotal = total - this.#prevTotal;

            if (diffTotal > 0) {
                const usage = (diffTotal - diffIdle) / diffTotal;
                if (Math.abs(this.#cpu - usage) > 0.001) {
                    this.#cpu = usage;
                    this.notify("cpu");
                }
            }

            this.#prevIdle = idle;
            this.#prevTotal = total;
        } catch (e) { console.error(e); }
    }

    #updateRAM() {
        try {
            const file = GLib.file_get_contents("/proc/meminfo")[1];
            const text = new TextDecoder().decode(file);

            const totalMatch = text.match(/MemTotal:\s+(\d+)/);
            const availMatch = text.match(/MemAvailable:\s+(\d+)/);

            if (totalMatch && availMatch) {
                const total = Number(totalMatch[1]);
                const available = Number(availMatch[1]);
                const usage = (total - available) / total;

                if (Math.abs(this.#ram - usage) > 0.001) {
                    this.#ram = usage;
                    this.notify("ram");
                }
            }
        } catch (e) { console.error(e); }
    }

    #updateTemp() {
        try {
            const path = "/sys/class/thermal/thermal_zone0/temp";
            const file = GLib.file_get_contents(path)[1];
            const temp = Number(new TextDecoder().decode(file).trim()) / 1000;

            if (Math.abs(this.#temp - temp) > 0.5) {
                this.#temp = temp;
                this.notify("temp");
            }

        } catch (e) {
            console.error(e);
        }
    }
}

const service = new PerformanceService();
export default service;