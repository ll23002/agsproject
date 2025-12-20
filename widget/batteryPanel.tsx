import { createBinding, createMemo, With } from "ags";
import { Gtk, Astal } from "ags/gtk4";
// @ts-ignore
import Battery from "gi://AstalBattery";
import GLib from "gi://GLib";

// Tu vieja confiable función sys, pero adaptada para devolver string limpio
function sys(cmd: string) {
    try {
        const [success, stdout] = GLib.spawn_command_line_sync(cmd);
        if (!success) return "";
        const decoder = new TextDecoder();
        return decoder.decode(stdout).trim();
    } catch (e) {
        return "";
    }
}

export default function BatteryPanel() {
    const battery = Battery.get_default();

    // Bindings nativos de Astal (Estos sí se actualizan solos)
    const levelBinding = createBinding(battery, "percentage");
    const stateBinding = createBinding(battery, "state");
    const iconBinding = createBinding(battery, "iconName");
    const timeToEmpty = createBinding(battery, "timeToEmpty");
    const timeToFull = createBinding(battery, "timeToFull");
    const chargingBinding = createBinding(battery, "charging");

    // Formateador de tiempo (Segundos -> Xh Ym)
    const formatTime = (seconds: number) => {
        if (seconds <= 0) return "Calculando...";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    // EL TRUCO: Un Memo que depende del nivel de batería.
    // Cada vez que cambia el % (levelBinding), releemos los archivos del sistema.
    // Así evitamos usar Variable.poll y usamos el evento del sistema.
    const batteryStats = createMemo(() => {
        // Leemos levelBinding() para "suscribirnos" a sus cambios
        const _trigger = levelBinding();

        const path = "/sys/class/power_supply/BAT0";

        // Leemos Ciclos
        const cycles = sys(`cat ${path}/cycle_count`) || "0";

        // Leemos Consumo (Watts)
        let rate = "0.00";
        try {
            // power_now suele ser microwatts
            const power = parseFloat(sys(`cat ${path}/power_now`));
            if (!isNaN(power)) {
                rate = (power / 1000000).toFixed(2);
            }
        } catch(e) {}

        // Calculamos Salud
        let health = "0";
        try {
            const full = parseFloat(sys(`cat ${path}/charge_full`));
            const design = parseFloat(sys(`cat ${path}/charge_full_design`));
            if (!isNaN(full) && !isNaN(design)) {
                health = Math.round((full / design) * 100).toString();
            }
        } catch(e) {}

        // Leemos voltaje (opcional, por si quieres verte muy pro)
        let volt = "0";
        try {
            const v = parseFloat(sys(`cat ${path}/voltage_now`));
            volt = (v / 1000000).toFixed(1);
        } catch(e) {}

        return {
            cycles,
            rate: `${rate} W`,
            health: `${health}%`,
            volt: `${volt} V`
        };
    });

    return (
        <menubutton widthRequest={145} heightRequest={60} direction={Gtk.ArrowType.LEFT}>
            {/* Botón Principal */}
            <box spacing={8}>
                <Gtk.Image iconName={iconBinding(i => i)} />
                <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
                    <label
                        label={levelBinding(p => `Carga: ${Math.floor(p * 100)}%`)}
                        halign={Gtk.Align.START}
                        css="font-weight: bold;"
                    />
                    <label
                        label={stateBinding(s => s === Battery.State.CHARGING ? "Cargando" : "Batería")}
                        halign={Gtk.Align.START}
                        css="font-size: 10px; color: #a6adc8;"
                    />
                </box>
            </box>

            {/* Popover con Detalles */}
            <popover>
                <box orientation={Gtk.Orientation.VERTICAL} spacing={8} widthRequest={240} class="panel-container">
                    <label
                        label="Información de Batería"
                        halign={Gtk.Align.START}
                        css="font-weight: bold; margin-bottom: 4px;"
                    />

                    <Gtk.Separator/>

                    <With value={batteryStats}>
                        {(stats) => (
                            <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>

                                {/* Salud y Ciclos */}
                                <box spacing={12}>
                                    <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                                        <label label="Salud" css="font-size: 10px; color: #a6adc8;" halign={Gtk.Align.START}/>
                                        <label
                                            label={stats.health}
                                            halign={Gtk.Align.START}
                                            css="font-weight: bold; color: #a6e3a1;"
                                        />
                                    </box>
                                    <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                                        <label label="Ciclos" css="font-size: 10px; color: #a6adc8;" halign={Gtk.Align.START}/>
                                        <label label={stats.cycles} halign={Gtk.Align.START}/>
                                    </box>
                                </box>

                                {/* Energía (Watts y Voltios) */}
                                <box spacing={12}>
                                    <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                                        <label label="Consumo" css="font-size: 10px; color: #a6adc8;" halign={Gtk.Align.START}/>
                                        <label label={stats.rate} halign={Gtk.Align.START}/>
                                    </box>
                                    <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                                        <label label="Voltaje" css="font-size: 10px; color: #a6adc8;" halign={Gtk.Align.START}/>
                                        <label label={stats.volt} halign={Gtk.Align.START}/>
                                    </box>
                                </box>
                            </box>
                        )}
                    </With>

                    <Gtk.Separator/>

                    {/* Tiempo Restante (Usando bindings directos de Astal) */}
                    <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                        <label
                            label={chargingBinding(c => c ? "Tiempo para carga completa" : "Tiempo restante")}
                            css="font-size: 10px; color: #a6adc8;"
                            halign={Gtk.Align.START}
                        />
                        <label
                            label={chargingBinding(c => c ? formatTime(timeToFull()) : formatTime(timeToEmpty()))}
                            halign={Gtk.Align.START}
                            css="font-weight: bold;"
                        />
                    </box>

                </box>
            </popover>
        </menubutton>
    );
}