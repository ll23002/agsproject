import { createBinding, With } from "ags";
import { Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";
import GObject from "gi://GObject";
import Pango from "gi://Pango";
// @ts-ignore
import Network from "gi://AstalNetwork";




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
        this.update().catch(console.error);
    }

    async update() {
        try {
            const out = await execAsync("nmcli -t -f NAME connection show");
            const list = out.split("\n").filter(Boolean);

            if (JSON.stringify(this.#saved) !== JSON.stringify(list)) {
                this.#saved = list;
                this.notify("saved");
            }
        } catch (e) {
            console.error(e);
        }
    }
}


const savedService = new SavedNetworkService();
const network = Network.get_default();

interface WifiItemProps {
    ap: any;
    onUpdate: () => void;
}

function WifiItem({ ap, onUpdate }: WifiItemProps) {
    const isSavedBinding = createBinding(savedService, "saved");

    const currentSsid = createBinding(network.wifi, "ssid");

    let entry: Gtk.Entry;
    let revealer: Gtk.Revealer;

    const connect = (password = "") => {
        const savedList = savedService.saved;
        const isSaved = savedList.includes(ap.ssid);

        if (!isSaved && !password) return;

        const cmd = isSaved
            ? `nmcli device wifi connect "${ap.ssid}"`
            : `nmcli device wifi connect "${ap.ssid}" password "${password}"`;

        execAsync(cmd)
            .then(() => {
                savedService.update().catch(console.error);
                onUpdate();
            })
            .catch(e => console.error(e));
    };

    const forgetNetwork = () => {
        execAsync(`nmcli connection delete id "${ap.ssid}"`)
            .then(() => {
                savedService.update().catch(console.error);
                onUpdate();
            })
            .catch(console.error);
    };

    return (
        <box orientation={Gtk.Orientation.VERTICAL}>
            <box class="network-row" spacing={4}>
                <button
                    class="network-item"
                    hexpand
                    onClicked={() => {
                        const isConnected = currentSsid() === ap.ssid;
                        if (isConnected) return;

                        if (savedService.saved.includes(ap.ssid)) {
                            connect();
                        } else {
                            revealer.reveal_child = !revealer.reveal_child;
                            if (revealer.reveal_child) entry.grab_focus();
                        }
                    }}
                >
                    <box spacing={8}>
                        <label
                            label={currentSsid(ssid => ssid === ap.ssid ? "\u{f0928}" : "\u{f092f}")}
                            css={currentSsid(ssid => ssid === ap.ssid ? "color: #0ABDC6;" : "")}
                        />

                        <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
                            <label
                                label={ap.ssid || "Red Oculta"}
                                hexpand
                                halign={Gtk.Align.START}
                                ellipsize={Pango.EllipsizeMode.END}
                                maxWidthChars={16}
                                css="font-weight: bold;"
                            />

                            <With value={isSavedBinding}>
                                {(savedList) => (
                                    <label
                                        label={currentSsid(ssid => {
                                            if (ssid === ap.ssid) return "Conectado";
                                            if (savedList.includes(ap.ssid)) return "Guardada";
                                            return `${ap.strength}%`;
                                        })}
                                        css={currentSsid(ssid => `
                                            font-size: 10px;
                                            color: ${ssid === ap.ssid ? "#0ABDC6" : "#6c7086"};
                                            ${ssid === ap.ssid ? "font-weight: bold;" : ""}
                                        `)}
                                        halign={Gtk.Align.START}
                                    />
                                )}
                            </With>
                        </box>
                    </box>
                </button>

                <With value={isSavedBinding}>
                    {(savedList) => {
                        const isSaved = savedList.includes(ap.ssid);
                        return (
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
                                                <label label={"\u{f16c5}"} />
                                                <label label="Olvidar Red" />
                                            </box>
                                        </button>
                                    </box>
                                </popover>
                            </menubutton>
                        );
                    }}
                </With>
            </box>

            {revealer = (
                <revealer
                    transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
                    revealChild={false}
                >
                    <box spacing={8} css="padding: 10px; background-color: rgba(0,0,0,0.2); border-radius: 0 0 8px 8px;">
                        {entry = (
                            <Gtk.Entry
                                placeholderText="Contraseña..."
                                visibility={false}
                                hexpand
                                onActivate={() => connect(entry.text)}
                                css={`background-color: rgba(9, 24, 51, 0.5); color: #ffffff; border: 1px solid #0ABDC6; border-radius: 8px; padding: 4px 8px; caret-color: #ffffff; margin-top: 4px;`}
                            />
                        )}
                        <button class="scan-button" onClicked={() => connect(entry.text)}>
                            <label label={"\u{f00d9}"} css="font-size: 16px;" />
                        </button>
                    </box>
                </revealer>
            ) as Gtk.Revealer}
        </box>
    );
}

export default function WifiPanel() {
    const wifiEnabled = createBinding(network.wifi, "enabled");
    const wifiSsid = createBinding(network.wifi, "ssid");
    const accessPoints = createBinding(network.wifi, "accessPoints");

    let scanInterval: number | null = null;

    const scanWifi = () => {
        if (network.wifi.enabled) {
            network.wifi.scan();
            savedService.update().catch(console.error);
        }
    };

    const startScanning = () => {
        scanWifi();
        scanInterval = setInterval(scanWifi, 6000);
    };

    const stopScanning = () => {
        if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
        }
    };




    return (
        <menubutton
            widthRequest={145}
            heightRequest={60}
            class={wifiEnabled(e => e ? "active" : "")}
            direction={Gtk.ArrowType.LEFT}
            halign={Gtk.Align.CENTER}
        >
            <box spacing={8} halign={Gtk.Align.CENTER}>
                <label label={wifiEnabled(e => e ? "\u{f0928}" : "\u{f092d}")} />
                <label
                    label={wifiSsid(s => s || "Desconectado")}
                    maxWidthChars={10}
                    ellipsize={Pango.EllipsizeMode.END}
                />
            </box>

            <popover onShow={() => startScanning()} onHide={() => stopScanning()}>
                <box orientation={Gtk.Orientation.VERTICAL} spacing={8} widthRequest={350}>
                    <box class="wifi-header">
                        <label label="Redes Wi-Fi" hexpand halign={Gtk.Align.START} />
                        <Gtk.Switch
                            active={wifiEnabled(e => e)}
                            onStateSet={(_: Gtk.Switch, state:boolean) => {
                                network.wifi.enabled = state;
                                if (state) setTimeout(scanWifi, 1000);
                                return false;
                            }}
                        />
                    </box>

                    <Gtk.Separator />

                    <Gtk.ScrolledWindow vexpand maxContentHeight={300} propagateNaturalHeight>
                        <With value={accessPoints}>
                            {(aps) => (
                                <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                                    {aps.length === 0 ? (
                                        <label label="No hay redes disponibles" class="empty-networks"/>
                                    ) : (
                                        aps.filter((ap: any) => ap.ssid)
                                            .sort((a: any, b: any) => b.strength - a.strength)
                                            .map((ap: any) => (
                                                <WifiItem
                                                    ap={ap}
                                                    onUpdate={scanWifi}
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
    );
}