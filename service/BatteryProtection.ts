import { createBinding } from "ags";
import GLib from "gi://GLib";
import GObject from "gi://GObject";

const THRESHOLD_PATH = "/sys/class/power_supply/BAT0/charge_control_end_threshold";
const CHARGE_LIMIT = 90;

const readFile = (path: string): string => {
    try {
        const [ok, data] = GLib.file_get_contents(path);
        if (ok) {
            const decoder = new TextDecoder();
            return decoder.decode(data).trim();
        }
    } catch (e) {
        console.error("Error leyendo archivo:", e);
    }
    return "";
};

const getCurrentThreshold = (): number => {
    const value = readFile(THRESHOLD_PATH);
    return parseInt(value, 10) || 100;
};

class BatteryProtectionState extends GObject.Object {
    static {
        GObject.registerClass({
            Properties: {
                'enabled': GObject.ParamSpec.boolean(
                    'enabled', 'Enabled', 'Battery protection enabled state',
                    GObject.ParamFlags.READWRITE,
                    getCurrentThreshold() === CHARGE_LIMIT,
                ),
            },
        }, this);
    }

    #enabled = getCurrentThreshold() === CHARGE_LIMIT;

    constructor() {
        super();
        const currentThreshold = getCurrentThreshold();
        this.#enabled = currentThreshold === CHARGE_LIMIT;
    }

    get enabled() {
        return this.#enabled;
    }

    set enabled(value: boolean) {
        if (this.#enabled !== value) {
            this.#enabled = value;
            this.notify('enabled');
        }
    }

    setProtection(enabled: boolean) {
        const newLimit = enabled ? CHARGE_LIMIT : 100;
        const cmd = `sh -c 'echo ${newLimit} | sudo -n tee ${THRESHOLD_PATH} > /dev/null'`;
        GLib.spawn_command_line_async(cmd);
        this.enabled = enabled;
    }

}

const service = new BatteryProtectionState();

export const batteryProtectionEnabled = createBinding(service, "enabled");

export const setBatteryProtection = (enabled: boolean) => {
    service.setProtection(enabled);
};

export const isBatteryAtProtectionLimit = (percentage: number, charging: boolean, protectionEnabled: boolean): boolean => {
    return charging && percentage >= (CHARGE_LIMIT / 100) && protectionEnabled;
};

export const getBatteryIcon = (percentage: number, charging: boolean, protectionEnabled: boolean): string => {
    if (isBatteryAtProtectionLimit(percentage, charging, protectionEnabled)) {
        return "\u{f0091}";
    }

    if (charging) {
        return "\u{f0084}";
    }

    if (percentage <= 0.05) {
        return "\u{f10cd}";
    }

    const icons = [
        "\u{f007a}", // 10%
        "\u{f007b}", // 20%
        "\u{f007c}", // 30%
        "\u{f007d}", // 40%
        "\u{f007e}", // 50%
        "\u{f007f}", // 60%
        "\u{f0080}", // 70%
        "\u{f0081}", // 80%
        "\u{f0082}", // 90%
        "\u{f0085}", // 100%
    ];

    const index = Math.min(Math.floor(percentage * 10), 9);
    return icons[index];
};

export { CHARGE_LIMIT };

