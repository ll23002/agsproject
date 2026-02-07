import WifiPanel from "./wifiPanel";
import BluetoothPanel from "./bluetoothPanel";
import BatteryPanel from "./batteryPanel";
import PowerPanel from "./PowerPanel";
import Rendimiento from "./Rendimiento";
import NoDisturbPanel from "./NoDisturbPanel";
import { showWidget } from "../service/BarState";
import NetworkStats from "./NetworkStats";
import {createBinding, createMemo} from "ags"
import { Gtk } from "ags/gtk4"
// @ts-ignore
import Notifd from "gi://AstalNotifd"
// @ts-ignore
import Network from "gi://AstalNetwork"
// @ts-ignore
import Bluetooth from "gi://AstalBluetooth"
// @ts-ignore
import Battery from "gi://AstalBattery";
import { batteryProtectionEnabled, getBatteryIcon } from "../service/BatteryProtection";



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

    const getBatColor = (p: number, charging: boolean) => {
        if (p < 0.2) return "#f38ba8";
        if (p < 0.4) return "#fab387";
        return "#ffffff";
    };

    const batInfo = createMemo(() => {
        const p = batPercent();
        const c = batCharging();
        const protectionEnabled = batteryProtectionEnabled();

        return {
            icon: getBatteryIcon(p, c, protectionEnabled),
            color: getBatColor(p, c),
            pct: Math.floor(p * 100)
        };
    });

    const rendimientoResult = Rendimiento({ isVisible: false });

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

                <popover
                    onShow={() => {
                        rendimientoResult.setVisible(true);
                    }}
                    onHide={() => {
                        rendimientoResult.setVisible(false);
                    }}
                >
                    <box class="panel-container" orientation={Gtk.Orientation.VERTICAL} spacing={16}
                         widthRequest={300}>

                        {rendimientoResult.widget}
                        <Gtk.Separator />
                        <PowerPanel />

                        <Gtk.Separator />

                        <box class="controls-grid" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
                            <box spacing={10}>
                                <WifiPanel />
                                <BluetoothPanel />
                            </box>

                            <box spacing={10}>
                                <NoDisturbPanel />
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