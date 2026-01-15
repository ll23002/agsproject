import { createBinding } from "ags"
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
// @ts-ignore
import Hyprland from "gi://AstalHyprland";

import WifiPanel from "./wifiPanel";
import BluetoothPanel from "./bluetoothPanel";
import BatteryPanel from "./batteryPanel";

import { showWidget, setHover, mouseService, setPopoverOpen } from "./BarState";


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
                              color = "#89b4fa"
                          }: {
    label: string,
    getValueFn: () => number,
    size?: number,
    lineWidth?: number,
    color?: string
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

        const percentage = `${Math.round(progress * 100)}%`;
        const extents = cr.textExtents(percentage);
        cr.moveTo(centerX - extents.width / 2, centerY + extents.height / 2);
        cr.showText(percentage);

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


export default function ControlPanel(gdkmonitor: Gdk.Monitor) {
    const notifd = Notifd.get_default();
    const network = Network.get_default();
    const bluetooth = Bluetooth.get_default();
    const battery = Battery.get_default();

    const dndBinding = createBinding(notifd, "dontDisturb");
    const wifiIcon = createBinding(network.wifi, "iconName");
    const wifiEnabled = createBinding(network.wifi, "enabled");
    const btOn = createBinding(bluetooth, "isPowered");
    const batIcon = createBinding(battery, "iconName");
    const batPercent = createBinding(battery, "percentage");


    let cpuValue = 0;
    let ramValue = 0;
    let batHealth = 0;

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
        const health = sys(cmd);
        batHealth = health;
        return batHealth;
    }

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
        getCpuUsage()
        getRamUsage()
        getBatHealth()
        return true;
    })

    getCpuUsage();
    getRamUsage();
    getBatHealth();

    const { TOP, RIGHT } = Astal.WindowAnchor;

    const mainBarContent = (
        <box spacing={12}>
            {/* WiFi Icon */}
            <label
                label={wifiEnabled(e => e ? "󰤨" : "󰤭")} // O usa wifiIcon() si quieres el icono de intensidad real
                css={wifiEnabled(e => e ? "" : "color: #a6adc8;")}
            />

            {/* Bluetooth Icon */}
            <label
                label={btOn(b => b ? "󰂯" : "󰂲")}
                css={btOn(b => b ? "" : "color: #a6adc8;")}
            />

            {/* DND Icon */}
            <label
                label={dndBinding(d => d ? "󰂛" : "󰂚")}
                css={dndBinding(d => d ? "color: #f38ba8;" : "")}
            />

            {/* Batería (Icono + Porcentaje) */}
            <box spacing={4}>
                <label label={batPercent(p => `${Math.floor(p * 100)}%`)} css="font-size: 11px;" />
                <Gtk.Image iconName={batIcon()} />
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

                            <box spacing={20} halign={Gtk.Align.CENTER}>
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
                            </box>
                        </box>

                        <Gtk.Separator />

                        <box class="controls-grid" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
                            <box spacing={10}>
                                <WifiPanel />
                                <BluetoothPanel />
                            </box>

                            <box spacing={10}>
                                <button
                                    hexpand
                                    widthRequest={145}
                                    heightRequest={60}
                                    class={dndBinding(d => d ? "dnd-button active" : "dnd-button")}
                                    onClicked={() => notifd.set_dont_disturb(!notifd.dontDisturb)}
                                >
                                    <box spacing={8}>
                                        <label label={dndBinding(d => d ? "󰂛" : "󰂚")} />
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

    const revealer = new Gtk.Revealer({
        transitionType: Gtk.RevealerTransitionType.SLIDE_DOWN,
        // @ts-ignore
        child: innerContent,
    });

    const updateState = () => {
        const shouldShow = showWidget();
        revealer.reveal_child = shouldShow;
    };

    const hypr = Hyprland.get_default();
    hypr.connect("notify::focused-client", updateState);
    mouseService.connect("notify::hovered", updateState);
    mouseService.connect("notify::popover_open", updateState);

    updateState();

    const mainBox = new Gtk.Box({
        valign: Gtk.Align.START,
    });

    let hoverTimeout: any = null;
    const cancelHoverTimeout = () => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
    };

    const controller = new Gtk.EventControllerMotion();

    controller.connect("enter", () => {
        cancelHoverTimeout();
        setHover(true);
    });

    controller.connect("leave", () => {
        cancelHoverTimeout();

        hoverTimeout = setTimeout(() => {
            setHover(false);
        }, 150);
    });

    mainBox.add_controller(controller);
    mainBox.add_css_class("ghost-killer");
    mainBox.append(revealer);
    return (
        <window
            visible
            name="control-panel"
            class="ControlPanel"
            gdkmonitor={gdkmonitor}
            exclusivity={Astal.Exclusivity.NORMAL}
            anchor={TOP | RIGHT}
            application={app}
            layer={Astal.Layer.OVERLAY}
            css="background-color: transparent;"
        >
            {mainBox}
        </window>
    );
}