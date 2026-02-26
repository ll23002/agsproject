import GObject from "gi://GObject";
import { execAsync } from "ags/process";

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
                )
            },
        }, this);
    }

    #expandedAp: string = "";
    #details: Record<string, { security: string, freq: string }> = {};
    #activeSsid: string = "";

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

    async scanDetails() {
        const timeout = (ms: number) =>
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`nmcli timeout after ${ms}ms`)), ms)
            );

        try {
            const out = await Promise.race([
                execAsync(["nmcli", "-t", "-f", "SSID,SECURITY,CHAN,FREQ", "device", "wifi", "list"]),
                timeout(8000),
            ]);

            const newDetails: Record<string, { security: string, freq: string }> = {};
            const lines = out.split("\n").filter(Boolean);
            for (const line of lines) {
                const parts = line.split(":");
                if (parts.length >= 4) {
                    const ssid = parts[0];
                    const security = parts[1];
                    const freq = parts[3];
                    if (ssid && !newDetails[ssid]) {
                        newDetails[ssid] = { security: security || "None", freq };
                    }
                }
            }
            this.details = newDetails;
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn("[WifiState] scanDetails abortado:", msg);
        }
    }
}

const wifiState = new WifiStateService();
export default wifiState;
