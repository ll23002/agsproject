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

        // Verificar y reintentar si es necesario (el kernel a veces tarda en aplicar el cambio)
        let retries = 0;
        const maxRetries = 3;

        const verifyAndRetry = () => {
            const currentThreshold = getCurrentThreshold();
            console.log(`[BatteryProtection] Verification attempt ${retries + 1}/${maxRetries} - Expected: ${newLimit}, Current: ${currentThreshold}`);

            if (currentThreshold === newLimit) {
                console.log(`[BatteryProtection] ✓ Threshold successfully set to ${newLimit}%`);
                this.syncFromSystem();
                return GLib.SOURCE_REMOVE;
            }

            retries++;
            if (retries >= maxRetries) {
                console.log(`[BatteryProtection] ✗ Failed to set threshold after ${maxRetries} attempts. Syncing state...`);
                this.syncFromSystem();
                return GLib.SOURCE_REMOVE;
            }

            // Reintentar
            console.log(`[BatteryProtection] Retrying command...`);
            GLib.spawn_command_line_async(cmd);
            return GLib.SOURCE_CONTINUE;
        };

        // Verificar después de 1 segundo, luego cada 500ms
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, verifyAndRetry);
    }

    syncFromSystem() {
        const currentThreshold = getCurrentThreshold();
        const shouldBeEnabled = currentThreshold === CHARGE_LIMIT;
        console.log(`[BatteryProtection] syncFromSystem() - Threshold: ${currentThreshold}, Should be enabled: ${shouldBeEnabled}, Current state: ${this.#enabled}`);

        if (this.#enabled !== shouldBeEnabled) {
            console.log(`[BatteryProtection] syncFromSystem() - Syncing state to match system`);
            this.enabled = shouldBeEnabled;
        }
    }
}

const service = new BatteryProtectionState();

// Sincronizar periódicamente cada 5 segundos
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
    service.syncFromSystem();
    return GLib.SOURCE_CONTINUE;
});

// Variable para controlar si la protección está activada
export const batteryProtectionEnabled = createBinding(service, "enabled");

// Función para activar/desactivar la protección
export const setBatteryProtection = (enabled: boolean) => {
    service.setProtection(enabled);
};

// Función para sincronizar manualmente
export const syncBatteryProtectionState = () => {
    service.syncFromSystem();
};

// Función para obtener el límite actual
export const getCurrentChargeLimit = (): number => {
    return getCurrentThreshold();
};

// Función para verificar si la batería está en modo protección (alcanzó el límite)
export const isBatteryAtProtectionLimit = (percentage: number, charging: boolean, protectionEnabled: boolean): boolean => {
    const result = charging && percentage >= (CHARGE_LIMIT / 100) && protectionEnabled;
    console.log(`[BatteryProtection] isBatteryAtProtectionLimit(${percentage.toFixed(2)}, ${charging}, ${protectionEnabled}) = ${result}`);
    return result;
};

// Función compartida para obtener el icono de batería
export const getBatteryIcon = (percentage: number, charging: boolean, protectionEnabled: boolean): string => {
    console.log(`[BatteryProtection] getBatteryIcon(${percentage.toFixed(2)}, charging=${charging}, protection=${protectionEnabled})`);

    // Si está en modo protección (conectada, al límite y protección activada)
    if (isBatteryAtProtectionLimit(percentage, charging, protectionEnabled)) {
        console.log(`[BatteryProtection] -> Returning protection icon`);
        return "\u{f0091}"; // Icono de batería con protección/escudo
    }

    if (charging) {
        console.log(`[BatteryProtection] -> Returning charging icon`);
        return "\u{f0084}"; // Batería cargando
    }

    if (percentage <= 0.05) {
        console.log(`[BatteryProtection] -> Returning critical icon`);
        return "\u{f10cd}"; // Batería crítica
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
    console.log(`[BatteryProtection] -> Returning percentage icon (index ${index})`);
    return icons[index];
};

export { CHARGE_LIMIT };

