import { createBinding, createMemo, With} from "ags";
import { Astal, Gtk } from "ags/gtk4";

// @ts-ignore
import Battery from "gi://AstalBattery";
import GLib from "gi://GLib";
import {setPopoverOpen} from "./BarState";


function sys(cmd: string) {
    try {
        const [success, stdout] = GLib.spawn_command_line_sync(cmd);
        if ( !success ) return "";
        if ( !stdout ) return "";
        const decoder = new TextDecoder();
        return decoder.decode(stdout).trim();
    }catch (e) {
        return "";
    }
}

export default function  BatteryPanel() {
    const battery = Battery.get_default();

    const levelBinding = createBinding(battery, "percentage");
    const stateBinding = createBinding(battery, "state");
    //const iconBinding = createBinding(battery, "iconName");
    const timeToEmpty = createBinding(battery, "timeToEmpty");
    const timeToFull = createBinding(battery, "timeToFull");
    const chargingBinding = createBinding(battery, "charging");


    const getBatIcon = (p: number, charging: boolean) => {
        if (charging) return "";
        if (p > 0.9) return "";
        if (p > 0.7) return "";
        if (p > 0.45) return "";
        if (p > 0.15) return "";
        return "";
    };

    const getBatColor = (p: number, charging: boolean) => {
        if (charging) return "#a6e3a1"; // Verde
        if (p < 0.2) return "#f38ba8";  // Rojo
        if (p < 0.4) return "#fab387";  // Naranja
        return "#ffffff";
    };

    const batDisplay = createMemo(() => {
        const p = levelBinding();
        const c = chargingBinding();

        return {
            icon: getBatIcon(p, c),
            color: getBatColor(p, c)
        };
    });



    const formatTime = (seconds: number) => {
        if (seconds <= 0) return "Calculando...";
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hrs}h ${mins}m`;
    }

    const batteryStats = createMemo(() => {
        const _trigger = levelBinding();
        const path = "/sys/class/power_supply/BAT0";

        const cycles = sys(`cat ${path}/cycle_count` || "0");


        let rate = "0.00";
        try {

            const voltage = parseFloat(sys(`cat ${path}/voltage_now`));
            const current = parseFloat(sys(`cat ${path}/current_now`));

            if (!isNaN(voltage) && !isNaN(current)) {
                const watts = (voltage * current) / 1000000000000;
                rate = watts.toFixed(2);
            }

        } catch (e) {
            console.error("Error calculando potencia", e);
        }

        let health = "0";
        try {
            const full = parseFloat(sys(`cat ${path}/charge_full`));
            const design = parseFloat(sys(`cat ${path}/charge_full_design`));
            if (!isNaN(full) && !isNaN(design)) {
                health =((full / design) * 100).toFixed(2);
            }
        } catch (e) {
            console.error("Error al obtener la salud de la batería: ", e);
        }

        let volt = "0";
        try {
            const v = parseFloat(sys(`cat ${path}/voltage_now`));
            volt = (v / 1000000).toFixed(1);
        } catch (e) {
            console.error("Error al obtener el voltaje de la batería: ", e);
        }

        return {
            cycles,
            rate: `${rate} W`,
            health: `${health} %`,
            volt: `${volt} V`
        };
    });


    return (
        <menubutton widthRequest={145} heightRequest={60} direction={Gtk.ArrowType.LEFT}>
            <box spacing={8} valign={Gtk.Align.CENTER} hexpand>
                <box spacing={4} valign={Gtk.Align.CENTER}>
                    <label
                        label={batDisplay(d => d.icon)}
                        css={batDisplay(d => `color: ${d.color};`)}
                        widthRequest={36}
                    />
                </box>

                <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
                    <label
                        label={levelBinding(p => `${Math.floor(p * 100)}%`)}
                        halign={Gtk.Align.START}
                        />
                    <label
                        label={stateBinding(s => s === Battery.State.CHARGING ? "Cargando" : "Bateria")}
                        halign={Gtk.Align.START}
                        css="font-size: 10px; color: #a6adc8;"
                        />
                </box>

            </box>


            <popover onMap={() => setPopoverOpen(true)} onUnmap={() => setPopoverOpen(false)}>
                <box orientation={Gtk.Orientation.VERTICAL} spacing={8} widthRequest={240} class="panel-container">
                    <label
                        label="Información de la batería"
                        halign={Gtk.Align.START}
                        css="font-weight: bold; margin-bottom:4px;"
                        />

                    <Gtk.Separator/>

                    <With value={batteryStats}>
                        {(stats) => (
                            <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
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

                    <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                        <label
                            label={chargingBinding(c => c ? "Tiempo para carga completa" : "Tiempo restante")}
                            css="font-size: 10px; color: #a6adc8;"
                            halign={Gtk.Align.START}
                            />

                        <label
                            label={chargingBinding(c => c ? formatTime(timeToFull()) : formatTime(timeToEmpty()))}
                            halign={Gtk.Align.START}
                            css="font-weight: bold; color: #89b4fa;"
                            />
                    </box>


                </box>
            </popover>



        </menubutton>
    )

}