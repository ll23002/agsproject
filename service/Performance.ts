import GObject from "gi://GObject";
import GLib from "gi://GLib";
// @ts-ignore
import GTop from "gi://GTop";

class PerformanceService extends GObject.Object {
    static {
        GObject.registerClass({
            Properties: {
                'cpu': GObject.ParamSpec.double('cpu', 'CPU Usage', 'CPU Usage Percentage', GObject.ParamFlags.READABLE, 0, 1, 0),
                'ram': GObject.ParamSpec.double('ram', 'RAM Usage', 'RAM Usage Percentage', GObject.ParamFlags.READABLE, 0, 1, 0),
                'temp': GObject.ParamSpec.double('temp', 'Temperature', 'System Temperature', GObject.ParamFlags.READABLE, 0, 100, 0),
            },
        }, this);
    }

    #cpu = 0;
    #ram = 0;
    #temp = 0;

    #gtopCpu = new GTop.glibtop_cpu();
    #gtopMem = new GTop.glibtop_mem();

    #prevIdle = 0;
    #prevTotal = 0;
    #decoder = new TextDecoder();

    constructor() {
        super();
        this.#update();

        GLib.timeout_add(GLib.PRIORITY_LOW, 2000, () => {
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
            GTop.glibtop_get_cpu(this.#gtopCpu);

            const total = this.#gtopCpu.total;
            const idle = this.#gtopCpu.idle;

            const deltaTotal = total - this.#prevTotal;
            const deltaIdle = idle - this.#prevIdle;

            if (deltaTotal > 0) {
                const usage = (deltaTotal - deltaIdle) / deltaTotal;

                if (Math.abs(this.#cpu - usage) > 0.001) {
                    this.#cpu = usage;
                    this.notify("cpu");
                }
            }

            this.#prevTotal = total;
            this.#prevIdle = idle;
        } catch (error) {
            console.error("[Performance] Error leyendo CPU:", error);
        }
    }

    #updateRAM() {
        try {
            GTop.glibtop_get_mem(this.#gtopMem);

            const total = this.#gtopMem.total;
            const usage = this.#gtopMem.user / total;

            if (Math.abs(this.#ram - usage) > 0.001) {
                this.#ram = usage;
                this.notify("ram");
            }
        } catch (error) {
            console.error("[Performance] Error leyendo RAM:", error);
        }
    }

    #updateTemp() {
        try {
            const path = "/sys/class/thermal/thermal_zone0/temp";
            const [ok, content] = GLib.file_get_contents(path);

            if (ok) {
                const temp = Number(this.#decoder.decode(content)) / 1000;

                if (Math.abs(this.#temp - temp) > 0.5) {
                    this.#temp = temp;
                    this.notify("temp");
                }
            }
        } catch (error) {
            console.error(error);
        }
    }
}

const service = new PerformanceService();
export default service;