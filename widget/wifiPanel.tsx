import { createBinding, With } from "ags"
import { Astal, Gtk, Gdk } from "ags/gtk4"
// @ts-ignore
import Network from "gi://AstalNetwork"
import { execAsync } from "ags/process"

export default function WifiPanel() {
    const network = Network.get_default();
    const wifiBinding = createBinding(network.wifi, "enabled");
    const wifiSsid = createBinding(network.wifi, "ssid");
    const accessPoints = createBinding(network.wifi, "accessPoints");

    // Ya no necesitas estados para la contraseña ni para mostrar la vista de auth.
    // El sistema se encarga.

    const connectToAp = (ssid: string) => {
        // EL COMANDO MÁGICO:
        // "device wifi connect" es inteligente. Si la red es nueva y tiene pass,
        // invocará al agente de polkit/sistema automáticamente.
        execAsync(`nmcli device wifi connect "${ssid}"`)
            .then(() => console.log(`Conectando a ${ssid}...`))
            .catch(e => console.error("Error o cancelado por usuario:", e));
    };

    return (
        <menubutton hexpand widthRequest={145} heightRequest={60} direction={Gtk.ArrowType.LEFT}>
            <box spacing={8}>
                <label label={wifiBinding(e => e ? "󰤨" : "󰤭")} />
                <label label={wifiSsid(s => s || "Desconectado")} />
            </box>
            <popover>
                <box orientation={Gtk.Orientation.VERTICAL} spacing={8} widthRequest={350}>
                    <box class="wifi-header">
                        <label
                            label="Redes WiFi"
                            hexpand
                            halign={Gtk.Align.START}
                        />
                        <Gtk.Switch
                            active={wifiBinding(e => e)}
                            onStateSet={(_, state) => {
                                network.wifi.enabled = state;
                                return false;
                            }}
                        />
                    </box>

                    <Gtk.Separator />

                    {/* Simplemente mostramos la lista. Nada de vistas condicionales. */}
                    <Gtk.ScrolledWindow
                        vexpand
                        maxContentHeight={300}
                        propagateNaturalHeight
                    >
                        <With value={accessPoints}>
                            {(aps) => (
                                <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                                    {aps.length === 0 ? (
                                        <label label="No hay redes disponibles" class="empty-networks" />
                                    ) : (
                                        // OJO: Filtramos duplicados o vacíos si quieres,
                                        // pero aquí va el map directo
                                        aps.map((ap: any) => (
                                            <button
                                                class="network-item"
                                                onClicked={() => {
                                                    // Al hacer clic, disparamos nmcli y cerramos (opcional)
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
    );
}