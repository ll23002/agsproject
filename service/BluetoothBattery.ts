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


    #intervalId: number | null = null;
    #isRunning = false;

    start() {
        if (this.#isRunning) return;
        this.#isRunning = true;
        this.update().catch(console.error);
        this.#intervalId = setInterval(() => this.update(), 15000);
    }

    stop() {
        if (!this.#isRunning) return;
        this.#isRunning = false;
        if (this.#intervalId !== null) {
            clearInterval(this.#intervalId);
            this.#intervalId = null;
        }
    }



    constructor() {
        super();
    }

    async update() {
        try {
            const activeDevicesStr = await execAsync("upower -e").catch(() => "");
            const activeDevices = activeDevicesStr.split("\n").filter(Boolean);
            
            const newBatteries: Record<string, number> = {};

            for (const devPath of activeDevices) {
                if (devPath.includes("bluez")) {
                    try {
                        const info = await execAsync(`upower -i ${devPath}`);
                        
                        let mac = "";
                        let percentage = -1;

                        const macMatch = devPath.match(/dev_([a-zA-Z0-9_]+)/);
                        if (macMatch && macMatch[1]) {
                            mac = macMatch[1].replace(/_/g, ":").toUpperCase();
                        }

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
                    if (newBatteries[mac] !== undefined) continue;
                    
                    try {
                        const info = await execAsync(`bluetoothctl info ${mac}`);
                        const pctMatch = info.match(/Battery Percentage:\s*(?:0x[a-fA-F0-9]+\s*\()?(\d+)/);
                        if (pctMatch && pctMatch[1]) {
                            newBatteries[mac] = parseInt(pctMatch[1], 10);
                        }
                    } catch (e) {
                        console.error("Error getting bluetoothctl info:", e);
                    }
                }
            } catch (e) {
                console.error("Error getting bluetoothctl devices:", e);
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
