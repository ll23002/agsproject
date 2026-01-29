import { createBinding, createMemo, With } from "ags";
import { Gtk } from "ags/gtk4";
// @ts-ignore
import Battery from "gi://AstalBattery";
import GLib from "gi://GLib"
import {setPopoverOpen} from "../service/BarState";

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

        if (charging) return "charging";
        if (p < 0.15) return "critical";
        if (p < 0.30) return "low";
        return "normal";
    });

    const batIcon = createMemo(() => {
        const charging = chargingBinding();
        const p = levelBinding();

        if (charging) return "\u{f0084}";


        if (p <= 0.05) return "\u{f10cd}";

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

        const index = Math.min(Math.floor(p * 10), 9);
        return icons[index];
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

            <popover onMap={()=> setPopoverOpen(true)} onUnmap={()=> setPopoverOpen(false)}>
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