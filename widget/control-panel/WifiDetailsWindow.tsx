import { Astal, Gtk, Gdk } from "ags/gtk4";
import { createBinding } from "ags";
import { execAsync } from "ags/process";
import GObject from "gi://GObject";
// @ts-ignore
import Network from "gi://AstalNetwork";

class WifiDetailsState extends GObject.Object {
    static {
        GObject.registerClass({
            GTypeName: "WifiDetailsState",
            Properties: {
                "active_ssid": GObject.ParamSpec.string(
                    "active_ssid", "Active SSID", "SSID to show details for",
                    GObject.ParamFlags.READWRITE, ""
                ),
                "ip": GObject.ParamSpec.string("ip", "IP", "IP", GObject.ParamFlags.READWRITE, "N/A"),
                "subnet": GObject.ParamSpec.string("subnet", "Subnet", "Subnet", GObject.ParamFlags.READWRITE, "N/A"),
                "router": GObject.ParamSpec.string("router", "Router", "Router", GObject.ParamFlags.READWRITE, "N/A"),
                "mac": GObject.ParamSpec.string("mac", "MAC", "MAC", GObject.ParamFlags.READWRITE, "N/A"),
                "freq": GObject.ParamSpec.string("freq", "Freq", "Freq", GObject.ParamFlags.READWRITE, "N/A"),
                "speed": GObject.ParamSpec.string("speed", "Speed", "Speed", GObject.ParamFlags.READWRITE, "N/A"),
                "security": GObject.ParamSpec.string("security", "Security", "Security", GObject.ParamFlags.READWRITE, "N/A"),
                "password": GObject.ParamSpec.string("password", "Password", "Password", GObject.ParamFlags.READWRITE, "N/A"),
            },
        }, this);
    }

    #activeSsid: string = "";
    get active_ssid() { return this.#activeSsid; }
    set active_ssid(val: string) {
        if (this.#activeSsid !== val) {
            this.#activeSsid = val;
            this.notify("active_ssid");
            if (val) this.refreshData(val);
        }
    }

    #ip = "N/A"; get ip() { return this.#ip; } set ip(val) { this.#ip=val; this.notify("ip"); }
    #subnet = "N/A"; get subnet() { return this.#subnet; } set subnet(val) { this.#subnet=val; this.notify("subnet"); }
    #router = "N/A"; get router() { return this.#router; } set router(val) { this.#router=val; this.notify("router"); }
    #mac = "N/A"; get mac() { return this.#mac; } set mac(val) { this.#mac=val; this.notify("mac"); }
    #freq = "N/A"; get freq() { return this.#freq; } set freq(val) { this.#freq=val; this.notify("freq"); }
    #speed = "N/A"; get speed() { return this.#speed; } set speed(val) { this.#speed=val; this.notify("speed"); }
    #security = "N/A"; get security() { return this.#security; } set security(val) { this.#security=val; this.notify("security"); }
    #password = "N/A"; get password() { return this.#password; } set password(val) { this.#password=val; this.notify("password"); }

    async refreshData(ssid: string) {
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

        const nmcli = (...args: string[]) =>
            withTimeout(execAsync(["nmcli", ...args]));

        try {
            const network = Network.get_default();
            const dev = network?.wifi?.deviceName || "wlp2s0";

            const connOut = await nmcli("connection", "show", ssid);
            const secMatch = connOut.match(/802-11-wireless-security.key-mgmt:\s*(.*)/);
            if (secMatch) this.security = secMatch[1].trim() === "wpa-psk" ? "WPA/WPA2-Personal" : secMatch[1].trim();
            else this.security = "WPA/WPA2";

            try {
                const pskOut = await nmcli("-s", "-g", "802-11-wireless-security.psk", "connection", "show", ssid);
                this.password = pskOut.trim() || "N/A";
            } catch {
                this.password = "N/A";
            }

            const devOut = await nmcli("device", "show", dev);
            for (const line of devOut.split("\n")) {
                if (line.includes("IP4.ADDRESS[1]:")) {
                    const parts = line.split(":")[1].trim().split("/");
                    this.ip = parts[0];
                    if (parts[1] === "24") this.subnet = "255.255.255.0";
                    else if (parts[1] === "16") this.subnet = "255.255.0.0";
                    else this.subnet = `/${parts[1]}`;
                }
                if (line.includes("IP4.GATEWAY:")) this.router = line.split(":")[1].trim();
                if (line.includes("GENERAL.HWADDR:")) this.mac = line.substring(line.indexOf(":") + 1).trim();
            }

            const activeList = await nmcli("device", "wifi", "list").catch(() => "");
            const activeLine = activeList.split("\n").find(l => l.startsWith("*"));
            if (activeLine) {
                const matchRate = activeLine.match(/(\d+)\s*Mbit\/s/);
                if (matchRate) this.speed = `${matchRate[1]} Mbps`;
                else this.speed = "Desconocido";

                if (activeLine.includes("5400") || activeLine.includes("5GHz")) this.freq = "Wi-Fi 5";
                else if (activeLine.includes("2400") || activeLine.includes("2.4GHz")) this.freq = "Wi-Fi 4";
                else this.freq = "Wi-Fi";
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn("[WifiDetails] refreshData abortado:", msg);
        }
    }
}

export const detailsState = new WifiDetailsState();

export const showWifiDetailsFor = {
    setValue: (val: string | null) => {
        detailsState.active_ssid = val || "";
    }
};

function InfoRow({ icon, title, valueBinding }: { icon: string, title: string, valueBinding: any }) {
    return (
        <box orientation={Gtk.Orientation.VERTICAL} spacing={4} hexpand>
            <box spacing={6}>
                <label label={icon} css="font-family: 'JetBrainsMono Nerd Font', 'FiraCode Nerd Font'; color: #a6adc8;" />
                <label label={title} css="font-weight: bold; font-size: 13px; color: #cdd6f4;" />
            </box>
            <label label={valueBinding} halign={Gtk.Align.START} css="font-size: 11px; color: #bac2de; opacity: 0.8;" wrap />
        </box>
    );
}

export default function WifiDetailsWindow(gdkmonitor: Gdk.Monitor) {
    // @ts-ignore
    const isOpen = createBinding(detailsState, "active_ssid");

    return (
        <window
            name="wifi-details"
            gdkmonitor={gdkmonitor}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
            layer={Astal.Layer.OVERLAY}
            visible={isOpen(s => s !== "")}
            css="background-color: transparent;"
        >
            <box
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.CENTER}
                css="background-color: rgba(24, 24, 37, 0.95); border: 1px solid #313244; box-shadow: 0 10px 40px rgba(0,0,0,0.8); border-radius: 20px; padding: 24px;"
                orientation={Gtk.Orientation.VERTICAL}
                spacing={20}
                widthRequest={380}
            >
                <box>
                    <button
                        onClicked={() => detailsState.active_ssid = ""}
                        css="background: transparent; border: none; box-shadow: none; padding: 4px;"
                    >
                        <label label={"\u{f00d}"} css="font-family: 'JetBrainsMono Nerd Font'; color: #a6adc8; font-size: 16px;" />
                    </button>
                    <box hexpand />
                    <label label={"\u{f00c}"} css="font-family: 'JetBrainsMono Nerd Font'; color: #a6adc8; font-size: 16px;" />
                </box>
                
                <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                    <label
                        label={isOpen(s => s || "Red")}
                        halign={Gtk.Align.START}
                        css="font-size: 24px; font-weight: bold; color: #cdd6f4;" 
                    />
                    <label
                        label="detalles de la red"
                        halign={Gtk.Align.START}
                        css="font-size: 14px; color: #a6adc8;" 
                    />
                </box>
                
                <box css="background-color: #1e1e2e; border-radius: 12px; padding: 12px; margin-top: 10px;">
                    <label label="Conectar automáticamente" hexpand halign={Gtk.Align.START} css="font-weight: bold;" />
                    <Gtk.Switch active={true} />
                </box>

                <box css="background-color: #1e1e2e; border-radius: 16px; padding: 16px;" orientation={Gtk.Orientation.VERTICAL} spacing={20}>
                    <box spacing={20}>
                        <InfoRow icon={"\u{f05a}"} title="Estado" valueBinding="Conectado" />
                        {/* @ts-ignore */}
                        <InfoRow icon={"\u{f0928}"} title="Tecnología" valueBinding={createBinding(detailsState, "freq")} />
                    </box>
                    <box spacing={20}>
                        {/* @ts-ignore */}
                        <InfoRow icon={"\u{f0e4}"} title="Velocidad de conexión" valueBinding={createBinding(detailsState, "speed")} />
                        <InfoRow icon={"\u{f012}"} title="Potencia de la señal" valueBinding="Buena" />
                    </box>
                    <box spacing={20}>
                        {/* @ts-ignore */}
                        <InfoRow icon={"\u{f023}"} title="Seguridad" valueBinding={createBinding(detailsState, "security")} />
                        {/* @ts-ignore */}
                        <InfoRow icon={"\u{f084}"} title="Contraseña" valueBinding={createBinding(detailsState, "password")} />
                    </box>
                    <box spacing={20}>
                        {/* @ts-ignore */}
                        <InfoRow icon={"\u{f0ac}"} title="Dirección IP" valueBinding={createBinding(detailsState, "ip")} />
                        {/* @ts-ignore */}
                        <InfoRow icon={"\u{f0e8}"} title="Máscara de subred" valueBinding={createBinding(detailsState, "subnet")} />
                    </box>
                    <box spacing={20}>
                        {/* @ts-ignore */}
                        <InfoRow icon={"\u{eadd}"} title="Router" valueBinding={createBinding(detailsState, "router")} />
                    </box>
                </box>

                <box css="background-color: #1e1e2e; border-radius: 16px; padding: 16px;" orientation={Gtk.Orientation.VERTICAL} spacing={16}>
                    <box>
                        <label label="Proxy" hexpand halign={Gtk.Align.START} css="font-weight: bold;" />
                        <label label="Ninguno" css="color: #a6adc8;" />
                        <label label={"\u{f107}"} css="font-family: 'JetBrainsMono Nerd Font'; margin-left: 8px; color: #a6adc8;" />
                    </box>
                    <box>
                        <label label="Configuración de IP" hexpand halign={Gtk.Align.START} css="font-weight: bold;" />
                        <label label="DHCP" css="color: #a6adc8;" />
                        <label label={"\u{f107}"} css="font-family: 'JetBrainsMono Nerd Font'; margin-left: 8px; color: #a6adc8;" />
                    </box>
                    <box>
                        <label label="Privacidad" hexpand halign={Gtk.Align.START} css="font-weight: bold;" />
                        <label label="Usar MAC aleatorio" css="color: #a6adc8;" />
                        <label label={"\u{f107}"} css="font-family: 'JetBrainsMono Nerd Font'; margin-left: 8px; color: #a6adc8;" />
                    </box>
                </box>
            </box>
        </window>
    );
}
