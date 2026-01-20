import {createBinding, With} from "ags";
import { Astal, Gtk, Gdk } from "ags/gtk4";

// @ts-ignore
import Network from "gi://AstalNetwork";
import { execAsync } from "ags/process";
import {setPopoverOpen} from "../service/BarState";
// @ts-ignore
import Pango from "gi://Pango";


export default function WifiPanel() {
    const network = Network.get_default();
    const wifiBinding = createBinding(network.wifi, "enabled");
    const wifiSsid = createBinding(network.wifi, "ssid");
    const accessPoints = createBinding(network.wifi, "accessPoints");

    const connectToAp = async (ssid: string) => {
        execAsync(`nmcli device wifi connect "${ssid}"`)
            .then(() => console.log("Conectando a ${ssid}"))
            .catch((e) => console.error("Error al conectar o cancelado por el usuario: ", e));
    };

    const scanWifi = () => {
        if (network.wifi.enabled) {
            execAsync("nmcli device wifi rescan")
                .catch((e) => console.error("Error al escanear redes Wi-Fi: ", e));
        }
    }

    setTimeout(() => scanWifi(), 1000);


    return (
        <menubutton
            widthRequest={145}
            heightRequest={60}
            class={wifiBinding(e => e ? "active" : "")}
            direction={Gtk.ArrowType.LEFT}
        >
            <box spacing={8}>
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
                                        aps.map((ap: any) => (
                                            <button
                                            class="network-item"
                                            onClicked={ () => {
                                                if (ap.ssid) connectToAp(ap.ssid);
                                            }}
                                            >
                                                <box spacing={8}>
                                                    <label label={ap.ssid === network.wifi.ssid ? "󰤨" : "󰤯"} />
                                                    <label label={ap.ssid} hexpand halign={Gtk.Align.START} />
                                                    <label label={`${Math.round(ap.strength)}%`} />
                                                </box>

                                            </button>
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