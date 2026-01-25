import {createBinding, createMemo} from "ags"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
// @ts-ignore
import Notifd from "gi://AstalNotifd"
// @ts-ignore
import Network from "gi://AstalNetwork"
// @ts-ignore
import Bluetooth from "gi://AstalBluetooth"
import GLib from "gi://GLib"
import Cairo from "cairo"
// @ts-ignore
import Battery from "gi://AstalBattery";

import WifiPanel from "./wifiPanel";
import BluetoothPanel from "./bluetoothPanel";
import BatteryPanel from "./batteryPanel";
import PowerPanel from "./PowerPanel";

import { showWidget, setPopoverOpen } from "../service/BarState";
import NetworkStats from "./NetworkStats";


function sys(cmd: string) {
    try {
        const [success, stdout] = GLib.spawn_command_line_sync(cmd);
        if (!success) return 0;
        const decoder = new TextDecoder();
        const output = stdout ? decoder.decode(stdout) : "";
        return parseFloat(output.trim());
    } catch (e) {
        return 0;
    }
}

function CircularProgress({
                              label,
                              getValueFn,
                              size = 80,
                              lineWidth = 8,
                              color = "#89b4fa",
                              format = (p) => `${Math.round(p * 100)}%`
                          }: {
    label: string,
    getValueFn: () => number,
    size?: number,
    lineWidth?: number,
    color?: string,
    format?: (value: number) => string
}) {
    const drawingArea = <drawingarea
        widthRequest={size}
        heightRequest={size}
    /> as Gtk.DrawingArea;

    const draw = (area: Gtk.DrawingArea, cr: any, width: number, height: number) => {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = (Math.min(width, height) - lineWidth) / 2 - lineWidth;
        const progress = getValueFn();

        cr.setOperator(Cairo.Operator.CLEAR);
        cr.paint();
        cr.setOperator(Cairo.Operator.OVER);

        cr.setSourceRGBA(0.3, 0.3, 0.3, 0.3);
        cr.setLineWidth(lineWidth);
        cr.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        cr.stroke();

        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        cr.setSourceRGBA(r, g, b, 1);
        cr.setLineWidth(lineWidth);
        cr.setLineCap(Cairo.LineCap.ROUND);


        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (progress * 2 * Math.PI);
        cr.arc(centerX, centerY, radius, startAngle, endAngle);
        cr.stroke();


        cr.setSourceRGBA(1, 1, 1, 1);
        cr.selectFontFace("Sans", Cairo.FontSlant.NORMAL, Cairo.FontWeight.BOLD);
        cr.setFontSize(16);

        const mainText = format(progress);

        //const percentage = `${Math.round(progress * 100)}%`;
        const extents = cr.textExtents(mainText);
        cr.moveTo(centerX - extents.width / 2, centerY + extents.height / 2);
        cr.showText(mainText);

        cr.setFontSize(10);
        cr.selectFontFace("Sans", Cairo.FontSlant.NORMAL, Cairo.FontWeight.NORMAL);
        const labelExtents = cr.textExtents(label);
        cr.moveTo(centerX - labelExtents.width / 2, centerY + extents.height / 2 + 15);
        cr.showText(label);
    };


    drawingArea.set_draw_func(draw);

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
        drawingArea.queue_draw();
        return true;
    });

    return drawingArea;

}


export function ControlPanel() {
    const notifd = Notifd.get_default();
    const network = Network.get_default();
    const bluetooth = Bluetooth.get_default();
    const battery = Battery.get_default();

    const dndBinding = createBinding(notifd, "dontDisturb");
    const wifiIcon = createBinding(network.wifi, "iconName");
    const wifiEnabled = createBinding(network.wifi, "enabled");
    const btOn = createBinding(bluetooth, "isPowered");

    const batPercent = createBinding(battery, "percentage");
    const batCharging = createBinding(battery, "charging");

    const getBatIcon = (p: number, charging: boolean) => {
        if (charging) return "\u{f0088}";

        if (p > 0.9) return "\u{f240}";
        if (p > 0.7) return "\u{f241}";
        if (p > 0.45) return "\u{f242}";
        if (p > 0.20) return "\u{f243}";
        if (p <= 0.10) return "\u{f244}";
    };

    const getBatColor = (p: number, charging: boolean) => {
        if (charging) return "#a6e3a1";
        if (p < 0.2) return "#f38ba8";
        if (p < 0.4) return "#fab387";
        return "#ffffff";
    };

    const batInfo = createMemo(() => {
        const p = batPercent();
        const c = batCharging();
        return {
            icon: getBatIcon(p, c),
            color: getBatColor(p, c),
            pct: Math.floor(p * 100)
        };
    });


    let cpuValue = 0;
    let ramValue = 0;
    let batHealth = 0;
    let tempValue = 0;

    const getCpuUsage = () => {
        const result = sys(`bash -c "grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'"`);
        cpuValue = result / 100;
        return cpuValue;
    };

    const getRamUsage = () => {
        ramValue = sys(`bash -c "free | awk '/Mem/ {print $3/$2}'"`);
        return ramValue;
    }

    const getBatHealth = () => {
        const cmd = `bash -c "echo $(( $(cat /sys/class/power_supply/BAT0/charge_full) * 100 / $(cat /sys/class/power_supply/BAT0/charge_full_design) ))"`;
        const health = sys(cmd)
        batHealth = health;
        return batHealth;
    }

    const getTemperature = () => {
        const temp = sys(`cat /sys/class/thermal/thermal_zone0/temp`);
        tempValue = (temp / 1000) / 100;
        return tempValue;
    }

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
        getCpuUsage()
        getRamUsage()
        getBatHealth()
        getTemperature()
        return true;
    })

    getCpuUsage();
    getRamUsage();
    getBatHealth();
    getTemperature();


    const mainBarContent = (
        <box spacing={12}>
            <NetworkStats/>
            <Gtk.Image
                iconName={wifiIcon(n => n)}
                css={wifiEnabled(e => e ? "" : "color: #a6adc8;")}
            />

            <label
                label={btOn(b => b ? "\u{f00af}" : "\u{f00b2}")}
                css={btOn(b => b ? "" : "color: #a6adc8;")}
            />

            <label
                label={dndBinding(d => d ? "\u{f05f9}" : "\u{f0f3}")}
                css={dndBinding(d => d ? "color: #00959b;" : "")}
            />

            <box spacing={4}>
                <label
                    label={batInfo(i => `${i.pct}%`)}
                    halign={Gtk.Align.END}
                    css="font-size: 11px; min-width: 30px;"
                />

                <label
                    label={batInfo(i => i.icon)}
                    css={batInfo(i => `color: ${i.color}; font-size: 16px;`)}
                />
            </box>
        </box>
    );

    const innerContent = (
        <box spacing={12}>
            <menubutton hexpand halign={Gtk.Align.CENTER}>
                {mainBarContent}

                <popover onMap={()=> setPopoverOpen(true)} onUnmap={()=> setPopoverOpen(false)}>
                    <box class="panel-container" orientation={Gtk.Orientation.VERTICAL} spacing={16}
                         widthRequest={300}>

                        <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                            <label label="Rendimiento" halign={Gtk.Align.START}
                                   css="font-weight: bold; margin-bottom: 5px;" />

                            <box spacing={15} halign={Gtk.Align.CENTER}>
                                <CircularProgress
                                    getValueFn={() => cpuValue}
                                    label="CPU"
                                    color="#89b4fa"
                                />
                                <CircularProgress
                                    getValueFn={() => ramValue}
                                    label="RAM"
                                    color="#f38ba8"
                                />
                                <CircularProgress
                                    getValueFn={() => tempValue}
                                    label="TEMP"
                                    color="#fab387"
                                    format={(p) => `${Math.round(p * 100)}°C`}
                                    />
                            </box>
                        </box>
                        <Gtk.Separator />
                        <PowerPanel />

                        <Gtk.Separator />

                        <box class="controls-grid" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
                            <box spacing={10}>
                                <WifiPanel />
                                <BluetoothPanel />
                            </box>

                            <box spacing={10}>
                                <button
                                    widthRequest={145}
                                    heightRequest={60}
                                    class={dndBinding(d => d ? "dnd-button active" : "dnd-button")}
                                    onClicked={() => notifd.set_dont_disturb(!notifd.dontDisturb)}
                                >
                                    <box spacing={8}>
                                        <label label={dndBinding(d => d ? "\u{f05f9}" : "\u{f0f3}")} />
                                        <label label="No Molestar" />
                                    </box>
                                </button>

                                <BatteryPanel />
                            </box>
                        </box>
                    </box>
                </popover>
            </menubutton>
        </box>
    );


    return (

            <box
                class="ghost-killer"
                valign={Gtk.Align.START}
                halign={Gtk.Align.END}
            >
                <revealer
                    transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}

                    revealChild={showWidget(v => v)}
                >
                    {innerContent}
                </revealer>
            </box>
    );
}