import GObject from "gi://GObject";
import { execAsync } from "ags/process";

class BluetoothBatteryService extends GObject.Object {
    static {
        GObject.registerClass({
            GTypeName: "BluetoothBatteryService",
            Properties: {
                "batteries": GObject.ParamSpec.jsobject(
                    "batteries", "Batteries", "Device batteries dict by MAC",
                    GObject.ParamFlags.READABLE
                )
            },
        }, this);
    }

    #batteries: Record<string, number> = {};

    get batteries() { return this.#batteries; }

    constructor() {
        super();
        this.update();
        // Update periodically
        setInterval(() => this.update(), 15000);
    }

    async update() {
        try {
            // Using upower to list devices, filtering for bluetooth
            const activeDevicesStr = await execAsync("upower -e").catch(() => "");
            const activeDevices = activeDevicesStr.split("\n").filter(Boolean);
            
            const newBatteries: Record<string, number> = {};

            for (const devPath of activeDevices) {
                if (devPath.includes("bluez")) {
                    try {
                        const info = await execAsync(`upower -i ${devPath}`);
                        
                        let mac = "";
                        let percentage = -1;
                        
                        // Extract MAC address from D-Bus path (e.g., /org/freedesktop/UPower/devices/mouse_dev_B4_2E_99_A2_2A_73)
                        const macMatch = devPath.match(/dev_([a-zA-Z0-9_]+)/);
                        if (macMatch && macMatch[1]) {
                            mac = macMatch[1].replace(/_/g, ":").toUpperCase();
                        }

                        // Extract percentage
                        const pctMatch = info.match(/percentage:\s+(\d+)%/);
                        if (pctMatch && pctMatch[1]) {
                            percentage = parseInt(pctMatch[1], 10);
                        }

                        if (mac && percentage !== -1) {
                            newBatteries[mac] = percentage;
                        }
                    } catch (e) {
                    }
                }
            }

            try {
                const btDevices = await execAsync("bluetoothctl devices Connected");
                const connectedMacs = btDevices.split("\n").map(l => l.split(" ")[1]).filter(Boolean);
                
                for (const mac of connectedMacs) {
                    if (newBatteries[mac] !== undefined) continue; // already found
                    
                    try {
                        const info = await execAsync(`bluetoothctl info ${mac}`);
                        // Matches both 'Battery Percentage: 0x64 (100)' and 'Battery Percentage: 100'
                        const pctMatch = info.match(/Battery Percentage:\s*(?:0x[a-fA-F0-9]+\s*\()?(\d+)/);
                        if (pctMatch && pctMatch[1]) {
                            newBatteries[mac] = parseInt(pctMatch[1], 10);
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            } catch (e) {
                // ignore if bluetoothctl fails
            }
            
            if (JSON.stringify(this.#batteries) !== JSON.stringify(newBatteries)) {
                this.#batteries = newBatteries;
                this.notify("batteries");
            }

        } catch (e) {
            console.error("Error updating Bluetooth batteries:", e);
        }
    }
}

const batteryService = new BluetoothBatteryService();
export default batteryService;
