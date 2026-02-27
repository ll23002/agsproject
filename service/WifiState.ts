import GObject from "gi://GObject";
import { execAsync } from "ags/process";

const withTimeout = async (p: Promise<string>, ms = 8000): Promise<string> => {
    let timerId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
        timerId = setTimeout(() => reject(new Error(`nmcli timeout after ${ms}ms`)), ms);
    });
    timeout.catch(() => {});
    try {
        return await Promise.race([p, timeout]);
    } finally {
        clearTimeout(timerId!);
    }
};

const nmcli = (...args: string[]) => withTimeout(execAsync(["nmcli", ...args]));

export interface AccessPoint {
    ssid: string;
    strength: number;
    bssid: string;
    freq: string;
    security: string;
}

class WifiStateService extends GObject.Object {
    static {
        GObject.registerClass({
            GTypeName: "WifiStateService",
            Properties: {
                "expanded_ap": GObject.ParamSpec.string(
                    "expanded_ap", "Expanded AP", "SSID of the currently expanded AP",
                    GObject.ParamFlags.READWRITE, ""
                ),
                "details": GObject.ParamSpec.jsobject(
                    "details", "Details", "Scanned network details",
                    GObject.ParamFlags.READWRITE
                ),
                "active_ssid": GObject.ParamSpec.string(
                    "active_ssid", "Active SSID", "Currently active SSID override",
                    GObject.ParamFlags.READWRITE, ""
                ),
                "enabled": GObject.ParamSpec.boolean(
                    "enabled", "Enabled", "Wifi Enabled State",
                    GObject.ParamFlags.READWRITE, true
                ),
                "access_points": GObject.ParamSpec.jsobject(
                    "access_points", "Access Points", "List of APs",
                    GObject.ParamFlags.READWRITE
                ),
            },
        }, this);
    }

    #expandedAp: string = "";
    #details: Record<string, { security: string, freq: string }> = {};
    #activeSsid: string = "";
    #enabled: boolean = true;
    #accessPoints: AccessPoint[] = [];

    get expanded_ap() { return this.#expandedAp; }
    set expanded_ap(val: string) {
        if (this.#expandedAp !== val) {
            this.#expandedAp = val;
            this.notify("expanded_ap");
        }
    }

    get details() { return this.#details; }
    set details(val: Record<string, { security: string, freq: string }>) {
        this.#details = val;
        this.notify("details");
    }

    get active_ssid() { return this.#activeSsid; }
    set active_ssid(val: string) {
        if (this.#activeSsid !== val) {
            this.#activeSsid = val;
            this.notify("active_ssid");
        }
    }

    get enabled() { return this.#enabled; }
    set enabled(val: boolean) {
        if (this.#enabled !== val) {
            this.#enabled = val;
            this.notify("enabled");
            nmcli("radio", "wifi", val ? "on" : "off").catch(() => {});
        }
    }

    get access_points() { return this.#accessPoints; }
    set access_points(val: AccessPoint[]) {
        this.#accessPoints = val;
        this.notify("access_points");
    }

    async scanDetails() {
        try {
            const radioOut = await nmcli("radio", "wifi");
            const isEnabled = radioOut.trim() === "enabled";
            if (this.#enabled !== isEnabled) {
                this.#enabled = isEnabled;
                this.notify("enabled");
            }

            if (!isEnabled) {
                this.active_ssid = "<disconnected>";
                this.access_points = [];
                return;
            }

            const out = await nmcli("-t", "-f", "IN-USE,SSID,SECURITY,CHAN,FREQ,SIGNAL,BSSID", "device", "wifi", "list");
            console.log("[WifiState] scanDetails:", out);

            const newDetails: Record<string, { security: string, freq: string }> = {};
            const aps: AccessPoint[] = [];
            let connectedSsid = "<disconnected>";
            
            const lines = out.split("\n").filter(Boolean);
            for (const line of lines) {
                const parts = line.split(":");
                if (parts.length >= 7) {
                    const inUse = parts[0] === "*";
                    const ssid = parts[1];
                    const security = parts[2] || "None";
                    const freq = parts[4];
                    const strength = parseInt(parts[5], 10) || 0;
                    const bssid = parts[6];

                    if (ssid) {
                        if (!newDetails[ssid]) {
                            newDetails[ssid] = { security, freq };
                            aps.push({ ssid, strength, bssid, freq, security });
                        }
                        if (inUse) connectedSsid = ssid;
                    }
                }
            }
            
            this.details = newDetails;
            this.access_points = aps;
            this.active_ssid = connectedSsid;
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn("[WifiState] scanDetails abortado:", msg);
        }
    }
}

const wifiState = new WifiStateService();
export default wifiState;
