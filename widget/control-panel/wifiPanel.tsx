import { createBinding, createMemo, With } from "ags";
import { Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";
import GObject from "gi://GObject";
import Pango from "gi://Pango";
// @ts-ignore
import Network from "gi://AstalNetwork";

const withTimeout = async (p: Promise<string>, ms = 8000): Promise<string> => {
    let timerId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
        timerId = setTimeout(() => reject(new Error(`nmcli timeout after ${ms}ms`)), ms);
    });
    timeout.catch(() => {}); // Prevenir warning GJS

    try {
        return await Promise.race([p, timeout]);
    } finally {
        clearTimeout(timerId!);
    }
};

const nmcli = (...args: string[]) => withTimeout(execAsync(["nmcli", ...args]));
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
        this.update().catch(e => {
            console.error("Error fetching saved networks:", e);
            execAsync(`notify-send \"Error al actualizar redes \" ${e}`)
                .catch(console.error);
        });

    }

    async update() {
        try {
            const out = await nmcli("-t", "-f", "NAME", "connection", "show");
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

import wifiState from "../../service/WifiState";
import { showWifiDetailsFor } from "./WifiDetailsWindow";

function WifiItem({ ap, onUpdate }: WifiItemProps) {
    const isSavedBinding = createBinding(savedService, "saved");
    const currentSsid = createBinding(wifiState, "active_ssid");
    
    const expandedBinding = createBinding(wifiState, "expanded_ap");
    const detailsBinding = createBinding(wifiState, "details");

    const connect = async (password = "") => {
        const isSaved = savedService.saved.includes(ap.ssid);
        if (!isSaved && !password) return;

        const cmd = isSaved
            ? ["device", "wifi", "connect", ap.ssid]
            : ["device", "wifi", "connect", ap.ssid, "password", password];

        try {
            await nmcli(...cmd);

            wifiState.active_ssid = ap.ssid;
            await savedService.update();
            onUpdate();
            wifiState.expanded_ap = "";
        } catch (e) {
            console.error("Error conectando a la red:", e);
            execAsync(`notify-send "Error al conectar a la red" "${e}"`).catch(console.error);
        }
    };

    const forgetNetwork = () => {
        nmcli("connection", "delete", "id", ap.ssid)
            .then(async () => {
                const wasConnected = wifiState.active_ssid === ap.ssid;
                wifiState.active_ssid = "<disconnected>";
                if (wasConnected) {
                    // Try to disconnect wlan0 explicitly, ignore errors
                    await nmcli("device", "disconnect", "wlan0").catch(() => {});
                }
                await savedService.update();
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
                        if (savedService.saved.includes(ap.ssid)) {
                            if (isConnected) return;
                            connect().catch(console.error);
                        } else {
                            wifiState.expanded_ap = wifiState.expanded_ap === ap.ssid ? "" : ap.ssid;
                        }
                    }}
                >
                    <box spacing={8}>
                        <label
                            label={currentSsid(ssid => ssid === ap.ssid ? "\u{f0928}" : "\u{f092f}")} // nf-md-wifi or nf-md-wifi_strength_outline
                            css={currentSsid(ssid => `font-family: 'JetBrainsMono Nerd Font', 'FiraCode Nerd Font', sans-serif; ${ssid === ap.ssid ? "color: #0ABDC6;" : ""}`)}
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
                                    <box spacing={4}>
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
                                        <label 
                                            label={detailsBinding(d => {
                                                const dt = d[ap.ssid];
                                                if (!dt) return "";
                                                return `• ${dt.security !== "--" ? dt.security : "Abierta"}`;
                                            })}
                                            css="font-size: 9px; color: #a6adc8; opacity: 0.7;"
                                        />
                                    </box>
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
                                <label label={"\u{f01d9}"} css="font-size: 16px; font-family: 'JetBrainsMono Nerd Font', 'FiraCode Nerd Font';" />
                                <popover>
                                    <box orientation={Gtk.Orientation.VERTICAL} spacing={4} widthRequest={150} css="padding: 5px;">
                                        <label label={ap.ssid} css="font-weight: bold; margin-bottom: 5px; opacity: 0.5;" halign={Gtk.Align.START}/>
                                        <button
                                            class="menu-item-btn"
                                            onClicked={() => {
                                                showWifiDetailsFor.setValue(ap.ssid);
                                            }}
                                            css="padding: 8px; border-radius: 6px; color: #89dceb;"
                                        >
                                            <box spacing={8}>
                                                <label label={"\u{f05a}"} css="font-family: 'JetBrainsMono Nerd Font', 'FiraCode Nerd Font';" /> 
                                                <label label="Detalles de la Red" />
                                            </box>
                                        </button>
                                        <button
                                            class="menu-item-btn"
                                            onClicked={forgetNetwork}
                                            css="padding: 8px; border-radius: 6px; color: #ff5555;"
                                        >
                                            <box spacing={8}>
                                                <label label={"\u{f06a}"} css="font-family: 'JetBrainsMono Nerd Font', 'FiraCode Nerd Font';" /> 
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

            <revealer
                transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
                revealChild={expandedBinding(ssid => ssid === ap.ssid)}
            >
                <box spacing={8} css="padding: 10px; background-color: rgba(0,0,0,0.2); border-radius: 0 0 8px 8px;">
                    <Gtk.Entry
                        placeholderText="Contraseña..."
                        visibility={false}
                        hexpand
                        onActivate={(self: Gtk.Entry) => connect(self.text)}
                        css={`background-color: rgba(9, 24, 51, 0.5); color: #ffffff; border: 1px solid #0ABDC6; border-radius: 8px; padding: 4px 8px; caret-color: #ffffff; margin-top: 4px;`}
                    />
                    <button class="scan-button" onClicked={(self: Gtk.Button) => {
                        // Traverse to entry sibling to get text
                        const parent = self.get_parent() as Gtk.Box;
                        const entry = parent.get_first_child() as Gtk.Entry;
                        if (entry) connect(entry.text);
                    }}>
                        <label label={"\u{f00d9}"} css="font-size: 16px; font-family: 'JetBrainsMono Nerd Font', 'FiraCode Nerd Font';" />
                    </button>
                </box>
            </revealer>
        </box>
    );
}

export default function WifiPanel() {
    const wifiEnabled = createBinding(wifiState, "enabled");
    const accessPoints = createBinding(wifiState, "access_points");
    const overrideSsid = createBinding(wifiState, "active_ssid");

    const displaySsid = createMemo(() => {
        const enabled = wifiEnabled();
        if (!enabled) return "Apagado";
        const override = overrideSsid();
        if (override === "<disconnected>" || override === "") return "Desconectado";
        return override;
    });

    const wifiIcon = createMemo(() => {
        if (!wifiEnabled()) return "\u{f092d}"; // wifi_off
        const override = overrideSsid();
        const connected = override !== "<disconnected>" && override !== "";
        return connected ? "\u{f0928}" : "\u{f092f}";
    });

    let scanInterval: number | null = null;

    const scanWifi = () => {
        if (wifiState.enabled) {
            nmcli("device", "wifi", "rescan").catch(() => {});
            savedService.update().catch(console.error);
            wifiState.scanDetails().catch(console.error);
        }
    };

    const startScanning = () => {
        scanWifi();
        scanInterval = setInterval(scanWifi, 10000);
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
                <label label={wifiIcon(v => v)} />
                <label
                    label={displaySsid(v => v)}
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
                                wifiState.enabled = state;
                                if (state) setTimeout(scanWifi, 1000);
                                return true;
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