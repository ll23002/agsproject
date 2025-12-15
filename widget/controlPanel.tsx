import { createPoll } from "ags/time"
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

function sys(cmd: string) {
    try {
        const [success, stdout] = GLib.spawn_command_line_sync(cmd);
        if (!success) return 0;
        const decoder = new TextDecoder();
        return parseFloat(decoder.decode(stdout))
    } catch (e) {
        return 0;
    }
}

export default function ControlPanel(gdkmonitor: Gdk.Monitor) {
    const notifd = Notifd.get_default();
    const network = Network.get_default();
    const bluetooth = Bluetooth.get_default();

    const dndBinding = createBinding(notifd, "dontDisturb");
    const wifiBinding = createBinding(network.wifi, "enabled");
    const wifiSsid = createBinding(network.wifi, "ssid");
    const btBinding = createBinding(bluetooth, "isPowered");

    const cpuUsage = createPoll(0, 2000, () => {
        return sys(`bash -c "grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage/100}'"`);
    });

    const ramUsage = createPoll(0, 2000, () => {
        return sys(`bash -c "free | awk '/Mem/ {printf \\\"%.2f\\\", $3/$2}'"`);
    });

    const { TOP, RIGHT } = Astal.WindowAnchor;

    return <window
        visible
        name="control-panel"
        class="ControlPanel"
        gdkmonitor={gdkmonitor}
        exclusivity={Astal.Exclusivity.NORMAL}
        anchor={TOP | RIGHT}
        application={app}
    >
        <box spacing={12}>
            <menubutton hexpand halign={Gtk.Align.CENTER}>
                <label label="󰒓" />
                <popover>
                    <box class="panel-container" orientation={Gtk.Orientation.VERTICAL} spacing={16}
                         widthRequest={300}>

                        <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                            <label label="Rendimiento" halign={Gtk.Align.START}
                                   css="font-weight: bold; margin-bottom: 5px;"/>

                            <box spacing={12}>
                                <label label="CPU" css="min-width: 40px; "/>
                                <Gtk.LevelBar
                                    orientation={Gtk.Orientation.VERTICAL}
                                    value={cpuUsage}
                                    maxValue={1}
                                    inverted
                                    css="min-height: 10px;"
                                />
                            </box>

                            <box spacing={12}>
                                <label label="RAM" css="min-width: 40px; "/>
                                <levelbar
                                    hexpand
                                    value={ramUsage}
                                    maxValue={1}
                                    css="min-height: 10px;"
                                />
                            </box>
                        </box>

                        <Gtk.Separator/>

                        <box class="controls-grid" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
                            <box spacing={10}>
                                <button
                                    hexpand
                                    onClicked={() => network.wifi.enabled = !network.wifi.enabled}
                                >
                                    <box spacing={8}>
                                        <label label={wifiBinding(e => e ? "󰤨" : "󰤭")}/>
                                        <label label={wifiSsid(s => s || "Desconectado")}/>
                                    </box>
                                </button>
                            </box>


                            <box spacing={10}>
                                <button
                                    hexpand
                                    onClicked={() => bluetooth.toggle()}
                                >
                                    <box spacing={8}>
                                        <label label={btBinding(p => p ? "󰂯" : "󰂲")}/>
                                        <label label={btBinding(p => p ? "Bluetooth On" : "Bluetooth Off")}/>
                                    </box>
                                </button>
                            </box>


                            <box spacing={10}>
                                <button
                                    hexpand
                                    css={dndBinding(d => d ? "background-color: #f38ba8; color: black;" : "")}
                                    onClicked={() => notifd.set_dont_disturb(!notifd.dontDisturb)}
                                >

                                    <box spacing={8}>
                                        <label label={dndBinding(d => d ? "󰂛" : "󰂚")}/>
                                        <label label="No Molestar"/>
                                    </box>
                                </button>
                            </box>
                        </box>


                    </box>
                </popover>
            </menubutton>
        </box>

    </window>
}