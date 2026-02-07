import { createBinding, createMemo, With } from "ags";
import { Gtk } from "ags/gtk4";
import GLib from "gi://GLib"
// @ts-ignore
import Battery from "gi://AstalBattery";
import {
    batteryProtectionEnabled,
    setBatteryProtection,
    getBatteryIcon,
    CHARGE_LIMIT
} from "../service/BatteryProtection";


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

export default function BatteryPanel() {
    const battery = Battery.get_default();

    const levelBinding = createBinding(battery, "percentage");
    const stateBinding = createBinding(battery, "state");
    const chargingBinding = createBinding(battery, "charging");
    const timeToEmpty = createBinding(battery, "timeToEmpty");
    const timeToFull = createBinding(battery, "timeToFull");

    const batClass = createMemo(() => {
        const charging = chargingBinding();
        const p = levelBinding();

        if (charging) {
            GLib.spawn_command_line_async(`paplay ${GLib.get_home_dir()}/Music/charging2.mp3`);
            return "charging";
        }
        if (p > 0.99) {
            GLib.spawn_command_line_async(`paplay ${GLib.get_home_dir()}/Music/cargada.mp3`);
            return "full";
        }

        if (p < 0.15) {
            GLib.spawn_command_line_async(`paplay ${GLib.get_home_dir()}/Music/low_battery.mp3`);
            return "critical";
        }

        if (p < 0.30) return "low";
        return "normal";
    });

    const batIcon = createMemo(() => {
        const charging = chargingBinding();
        const p = levelBinding();
        const protectionEnabled = batteryProtectionEnabled();

        return getBatteryIcon(p, charging, protectionEnabled);
    });

    const formatTime = (seconds: number) => {
        if (seconds <= 0) return "Calculando...";
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hrs}h ${mins}m`;
    };

    const batteryStats = createMemo(() => {
        levelBinding();

        const path = "/sys/class/power_supply/BAT0"

        const cycles = readFile(`${path}/cycle_count`) || "0";

        const voltageRaw = parseFloat(readFile(`${path}/voltage_now`) || "0");
        const volt = !isNaN(voltageRaw) ? `${(voltageRaw / 1e6).toFixed(1)}V` : "0.0 V";

        const powerRaw = parseFloat(readFile(`${path}/power_now`) || "0");
        let rate = "0.0 W"
        if (!isNaN(powerRaw)) {
            rate = `${(powerRaw / 1e6).toFixed(1)} W`;
        }

        const fullRaw = parseFloat(readFile(`${path}/energy_full`) || "0");
        const designRaw = parseFloat(readFile(`${path}/energy_full_design`) || "0");

        let health = "N/A";
        if (!isNaN(fullRaw) && !isNaN(designRaw) && designRaw > 0) {
            health = `${((fullRaw / designRaw)* 100).toFixed(0)}%`;
        }

        return { cycles, rate, health, volt };
    });

    return (
        <menubutton
            halign={Gtk.Align.FILL}
            class={batClass(c => `battery-panel ${c}`)}
            direction={Gtk.ArrowType.LEFT}
            widthRequest={145}
            heightRequest={60}
        >
            <box spacing={8} valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
                <label
                    class="bat-icon"
                    label={batIcon()}
                    css="font-size: 24px;"
                />

                <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
                    <label
                        class="bat-percentage"
                        label={levelBinding(p => `${Math.floor(p * 100)}%`)}
                        halign={Gtk.Align.START}
                    />
                    <label
                        class="bat-state"
                        label={stateBinding(s => s === Battery.State.CHARGING ? "Cargando" : "Batería")}
                        halign={Gtk.Align.START}
                    />
                </box>
            </box>

            <popover>
                <box orientation={Gtk.Orientation.VERTICAL} spacing={8} widthRequest={240} class="panel-container">
                    <label label="Energía" class="header-label" halign={Gtk.Align.START} />
                    <Gtk.Separator />

                    <With value={batteryStats}>
                        {stats => (
                            <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
                                <box spacing={12} homogeneous>
                                    <box orientation={Gtk.Orientation.VERTICAL}>
                                        <label label={"\u{f120f}  Salud"} class="sub-label" halign={Gtk.Align.START} />
                                        <label label={stats.health} class="value-label health" halign={Gtk.Align.START} />
                                    </box>
                                    <box orientation={Gtk.Orientation.VERTICAL}>
                                        <label label={"\u{f1835}  Ciclos"} class="sub-label" halign={Gtk.Align.START} />
                                        <label label={stats.cycles} class="value-label" halign={Gtk.Align.START} />
                                    </box>
                                </box>
                                <box spacing={12} homogeneous>
                                    <box orientation={Gtk.Orientation.VERTICAL}>
                                        <label label={"\u{f17de}  Consumo"} class="sub-label" halign={Gtk.Align.START} />
                                        <label label={stats.rate} class="value-label" halign={Gtk.Align.START} />
                                    </box>
                                    <box orientation={Gtk.Orientation.VERTICAL}>
                                        <label label={"\u{f1904}  Voltaje"} class="sub-label" halign={Gtk.Align.START} />
                                        <label label={stats.volt} class="value-label" halign={Gtk.Align.START} />
                                    </box>
                                </box>
                            </box>
                        )}
                    </With>

                    <Gtk.Separator />

                    <box spacing={8} halign={Gtk.Align.FILL}>
                        <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                            <label
                                label={"\u{f0091}  Protección de batería"}
                                class="sub-label"
                                halign={Gtk.Align.START}
                            />
                            <label
                                label={`Limita la carga al ${CHARGE_LIMIT}%`}
                                class="value-label"
                                halign={Gtk.Align.START}
                                css="font-size: 10px; opacity: 0.7;"
                            />
                        </box>
                        <Gtk.Switch
                            active={batteryProtectionEnabled(e => e)}
                            // @ts-ignore
                            onStateSet={(_, state) => {
                                setBatteryProtection(state);
                                return false;
                            }}
                            valign={Gtk.Align.CENTER}
                        />
                    </box>

                    <Gtk.Separator />

                    <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                        <label
                            label={chargingBinding(c => c ? "\u{f19e6} Tiempo para lleno" : "\u{f19e6} Tiempo restante")}
                            class="sub-label"
                            halign={Gtk.Align.START}
                        />
                        <label
                            label={chargingBinding(c => c ? formatTime(timeToFull()) : formatTime(timeToEmpty()))}
                            halign={Gtk.Align.START}
                            class="time-label"
                        />
                    </box>
                </box>
            </popover>
        </menubutton>
    );
}