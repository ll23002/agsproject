import { createBinding, With, createMemo } from "ags";
import { Astal, Gtk, Gdk } from "ags/gtk4";
// @ts-ignore
import Network from "gi://AstalNetwork";
import { execAsync } from "ags/process";
import { setPopoverOpen } from "../service/BarState";
// @ts-ignore
import Pango from "gi://Pango";
import GLib from "gi://GLib";
import GObject from "gi://GObject";

class SavedNetworkService extends GObject.Object {
    static {
        GObject.registerClass({
            GTypeName: "SavedNetworkService",
            Properties: {
                "saved": GObject.ParamSpec.jsobject(
                    "saved", "Saved", "Saved Networks List",
                    GObject.ParamFlags.READABLE,
                ),
            },
        }, this);
    }

    #saved: string[] = [];

    get saved() {
        return this.#saved;
    }

    constructor() {
        super();
        this.refresh();
        GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, () => {
            this.refresh();
            return true;
        });
    }

    async refresh() {
        try {
            const out = await execAsync("nmcli -t -f NAME connection show");
            const list = out.split("\n").filter(Boolean);

            if (JSON.stringify(this.#saved) !== JSON.stringify(list)) {
                this.#saved = list;
                this.notify("saved");
            }
        } catch (e) {
            console.error("Error actualizando redes guardadas:", e);
        }
    }
}

const savedService = new SavedNetworkService();

function WifiItem({ ap, network, savedNetworks, onUpdate }: { ap: any, network: any, savedNetworks: string[], onUpdate: () => void }) {

    const isSaved = savedNetworks.includes(ap.ssid);
    const isConnected = network.wifi.ssid === ap.ssid;

    let statusLabel: Gtk.Label;
    let entry: Gtk.Entry;
    let revealer: Gtk.Revealer;

    const connect = (password: string = "") => {
        if (statusLabel) statusLabel.label = "Conectando...";

        const cmd = (password || isSaved)
            ? `nmcli device wifi connect "${ap.ssid}"`
            : `nmcli device wifi connect "${ap.ssid}" password "${password}" name "${ap.ssid}"`;

        execAsync(cmd)
            .then(() => savedService.refresh())
            .catch(e => {
                console.error(`Error conectando a ${ap.ssid}:`, e);
                if (statusLabel) statusLabel.label = "Falló la conexión";
            });
    };

    const forgetNetwork = () => {
        execAsync(`nmcli connection delete id "${ap.ssid}"`)
            .then(() => {
                savedService.refresh();
                onUpdate();
            })
            .catch(e => console.error(e));
    };

    const getStatusText = () => {
        if (isConnected) return "Conectado";
        if (isSaved) return "Guardada";
        return `${Math.round(ap.strength)}%`;
    };

    entry = (
        <Gtk.Entry
            placeholderText="Contraseña..."
            visibility={false}
            hexpand
            onActivate={() => connect(entry.text)}
            css={`
                background-color: rgba(9, 24, 51, 0.5); 
                color: #ffffff;
                border: 1px solid #0ABDC6; 
                border-radius: 8px; 
                padding: 4px 8px;
                caret-color: #ffffff;
                margin-top: 4px;
            `}
        />
    ) as Gtk.Entry;

    revealer = (
        <revealer
            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
            revealChild={false}
        >
            <box spacing={8} css="padding: 10px; background-color: rgba(0,0,0,0.2); border-radius: 0 0 8px 8px;">
                {entry}
                <button
                    class="scan-button"
                    onClicked={() => connect(entry.text)}
                >
                    <label label={"\u{f00d9}"} css="font-size: 16px;" />
                </button>
            </box>
        </revealer>
    ) as Gtk.Revealer;

    statusLabel = (
        <label
            label={getStatusText()}
            css={`
                font-size: 10px; 
                color: ${isConnected ? "#0ABDC6" : "#6c7086"};
                ${isConnected ? "font-weight: bold;" : ""}
            `}
            halign={Gtk.Align.START}
        />
    ) as Gtk.Label;

    return (
        <box orientation={Gtk.Orientation.VERTICAL}>
            <box class="network-row" spacing={4}>
                <button
                    class="network-item"
                    hexpand
                    onClicked={() => {
                        if (isConnected) return;
                        if (isSaved) {
                            connect();
                        } else {
                            revealer.reveal_child = !revealer.reveal_child;
                            if (revealer.reveal_child) entry.grab_focus();
                        }
                    }}
                >
                    <box spacing={8}>
                        <label label={isConnected ? "\u{f0928}" : "\u{f092f}"} css={isConnected ? "color: #0ABDC6;" : ""} />
                        <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
                            <label
                                label={ap.ssid || "Red Oculta"}
                                hexpand
                                halign={Gtk.Align.START}
                                ellipsize={Pango.EllipsizeMode.END}
                                maxWidthChars={16}
                                css="font-weight: bold;"
                            />
                            {statusLabel}
                        </box>
                    </box>
                </button>

                <menubutton
                    class="option-btn"
                    valign={Gtk.Align.CENTER}
                    sensitive={isSaved}
                    css={`
                        background: transparent;
                        padding: 4px;
                        border-radius: 99px;
                        color: ${isSaved ? "#ffffff" : "rgba(255,255,255,0.2)"};
                    `}
                >
                    <label label={"\u{f01d9}"} css="font-size: 16px;" />
                    <popover>
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={4} widthRequest={150} css="padding: 5px;">
                            <label label={ap.ssid} css="font-weight: bold; margin-bottom: 5px; opacity: 0.5;" halign={Gtk.Align.START}/>
                            <button
                                class="menu-item-btn"
                                onClicked={forgetNetwork}
                                css="padding: 8px; border-radius: 6px; color: #ff5555;"
                            >
                                <box spacing={8}>
                                    <label  label={"\u{f16c5}"} />
                                    <label label="Olvidar Red" />
                                </box>
                            </button>
                        </box>
                    </popover>
                </menubutton>
            </box>
            {revealer}
        </box>
    );
}

export default function WifiPanel() {
    const network = Network.get_default();
    const wifiBinding = createBinding(network.wifi, "enabled");
    const wifiSsid = createBinding(network.wifi, "ssid");
    const accessPoints = createBinding(network.wifi, "accessPoints");
    const savedNetworksBinding = createBinding(savedService, "saved");

    const wifiState = createMemo(() => ({
        aps: accessPoints() || [],
        saved: savedNetworksBinding() || [],
        currentSsid: wifiSsid()
    }));

    const scanWifi = () => {
        if (network.wifi.enabled) {
            execAsync("nmcli device wifi rescan").catch(console.error);
            savedService.refresh();
        }
    }

    return (
        <menubutton
            widthRequest={145}
            heightRequest={60}
            class={wifiBinding(e => e ? "active" : "")}
            direction={Gtk.ArrowType.LEFT}
            halign={Gtk.Align.CENTER}
        >
            <box spacing={8} halign={Gtk.Align.CENTER}>
                <label label={wifiBinding(e => e ? "\u{f0928}" : "\u{f092d}")} />
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
                        <label label="Redes Wi-Fi" hexpand halign={Gtk.Align.START} />
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

                    <Gtk.ScrolledWindow vexpand maxContentHeight={300} propagateNaturalHeight>
                        <With value={wifiState}>
                            {({ aps, saved, currentSsid }) => (
                                <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                                    {aps.length === 0 ? (
                                        <label label="No hay redes disponibles" class="empty-networks"/>
                                    ) : (
                                        // @ts-ignore
                                        aps.filter(ap => ap.ssid)
                                            // @ts-ignore
                                            .sort((a, b) => {
                                                const aIsConnected = a.ssid === currentSsid;
                                                const bIsConnected = b.ssid === currentSsid;

                                                if (aIsConnected && !bIsConnected) return -1;
                                                if (!aIsConnected && bIsConnected) return 1;

                                                return b.strength - a.strength;
                                            })
                                            // @ts-ignore
                                            .map((ap: any) => (
                                                <WifiItem
                                                    ap={ap}
                                                    network={network}
                                                    savedNetworks={saved}
                                                    onUpdate={() => scanWifi()}
                                                />
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