import { createBinding, With } from "ags";
import { Astal, Gtk, Gdk } from "ags/gtk4";
// @ts-ignore
import Network from "gi://AstalNetwork";
import { execAsync } from "ags/process";
import { setPopoverOpen } from "../service/BarState";
// @ts-ignore
import Pango from "gi://Pango";

function WifiItem({ ap, network }: { ap: any, network: any }) {

    const entry = (
        <Gtk.Entry
            placeholderText="Contraseña..."
            visibility={false}
            hexpand
            onActivate={() => connect()}
            css={`
                background-color: rgba(9, 24, 51, 0.5); 
                color: #ffffff;
                border: 1px solid #0ABDC6; 
                border-radius: 8px; 
                padding: 4px 8px;
                caret-color: #ffffff;
            `}
        />
    ) as Gtk.Entry;

    const connect = () => {
        const password = entry.text || "";

        const cmd = password
            ? `nmcli device wifi connect "${ap.ssid}" password "${password}" name "${ap.ssid}"`
            : `nmcli device wifi connect "${ap.ssid}" name "${ap.ssid}"`;

        execAsync(cmd)
            .then(() => print(`Conectando a ${ap.ssid}...`))
            .catch(e => {
                console.error(`Error conectando a ${ap.ssid}:`, e);
            });
    };

    const revealer = (
        <revealer
            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
            revealChild={false}
        >
            <box spacing={8} css="padding: 10px; background-color: rgba(0,0,0,0.2); border-radius: 0 0 8px 8px;">
                {entry}
                <button
                    class="scan-button"
                    onClicked={connect}
                >
                    <Gtk.Image iconName="network-wireless-symbolic" />
                </button>
            </box>
        </revealer>
    ) as Gtk.Revealer;

    return (
        <box orientation={Gtk.Orientation.VERTICAL}>
            <button
                class="network-item"
                onClicked={() => {
                    if (ap.ssid !== network.wifi.ssid) {
                        revealer.reveal_child = !revealer.reveal_child;
                        if (revealer.reveal_child) {
                            entry.grab_focus();
                        }
                    }
                }}
            >
                <box spacing={8}>
                    <label label={ap.ssid === network.wifi.ssid ? "󰤨" : "󰤯"} />
                    <label
                        label={ap.ssid || "Red Oculta"}
                        hexpand
                        halign={Gtk.Align.START}
                        ellipsize={Pango.EllipsizeMode.END}
                        maxWidthChars={18}
                    />
                    <label label={`${Math.round(ap.strength)}%`} css="color: #6c7086; font-size: 11px;" />
                </box>
            </button>
            {revealer}
        </box>
    );
}

export default function WifiPanel() {
    const network = Network.get_default();
    const wifiBinding = createBinding(network.wifi, "enabled");
    const wifiSsid = createBinding(network.wifi, "ssid");
    const accessPoints = createBinding(network.wifi, "accessPoints");

    const scanWifi = () => {
        if (network.wifi.enabled) {
            execAsync("nmcli device wifi rescan")
                .catch((e) => console.error("Scan error:", e));
        }
    }

    // Escaneo inicial
    setTimeout(() => scanWifi(), 1000);

    return (
        <menubutton
            widthRequest={145}
            heightRequest={60}
            class={wifiBinding(e => e ? "active" : "")} // class es lo correcto en JSX
            direction={Gtk.ArrowType.LEFT}
            halign={Gtk.Align.CENTER}
        >
            <box spacing={8} halign={Gtk.Align.CENTER}>
                <label label={wifiBinding(e => e ? "󰤨" : "󰤭")} />
                <label
                    label={wifiSsid(s => s || "Desconectado")}
                    maxWidthChars={10}
                    ellipsize={Pango.EllipsizeMode.END}
                />
            </box>

            <popover
                onShow={() => scanWifi()}
                onMap={()=> setPopoverOpen(true)}
                onUnmap={()=> setPopoverOpen(false)}
            >
                <box orientation={Gtk.Orientation.VERTICAL} spacing={8} widthRequest={350}>
                    <box class="wifi-header">
                        <label
                            label="Redes Wi-Fi"
                            hexpand
                            halign={Gtk.Align.START}
                        />
                        <Gtk.Switch
                            active={wifiBinding(e => e)}
                            // @ts-ignore
                            onStateSet={(_, state) => {
                                network.wifi.enabled = state;
                                if (state) setTimeout(scanWifi, 1000);
                                return false;
                            }}
                        />
                    </box>

                    <Gtk.Separator />

                    <Gtk.ScrolledWindow
                        vexpand
                        maxContentHeight={300}
                        propagateNaturalHeight
                    >
                        <With value={accessPoints}>
                            { (aps) => (
                                <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                                    {aps.length === 0 ? (
                                        <label label="No hay redes disponibles" class="empty-networks"/>
                                    ): (
                                        // @ts-ignore
                                        aps.filter(ap => ap.ssid)
                                            // @ts-ignore
                                            .sort((a, b) => b.strength - a.strength)
                                            // @ts-ignore
                                            .map((ap: any) => (
                                                <WifiItem ap={ap} network={network} />
                                            ))
                                    )}
                                </box>
                            )}
                        </With>
                    </Gtk.ScrolledWindow>
                </box>
            </popover>
        </menubutton>
    )
}