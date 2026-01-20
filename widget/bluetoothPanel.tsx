import {createBinding, With, createMemo} from "ags";
import {Gtk} from "ags/gtk4"
import { setPopoverOpen} from "../service/BarState";
// @ts-ignore
import Bluetooth from "gi://AstalBluetooth";
import {execAsync} from "ags/process";


export default function BluetoothPanel() {
    const bluetooth = Bluetooth.get_default();
    const btBinding = createBinding(bluetooth, "isPowered");
    const devices = createBinding(bluetooth, "devices");

    const combinedBinding = createMemo(() => ({
        powered: btBinding(),
        devs: devices()
    }));

    const connectToDevice = async (device: any) => {
        try {
            if (device.connected) {
                await execAsync(`bluetoothctl disconnect ${device.address}`);
            } else {
                if (!bluetooth.isPowered) {
                    await execAsync("rfkill unblock bluetooth");
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await execAsync("bluetoothctl power on");
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                if (device.paired) {
                    await execAsync(`bluetoothctl connect ${device.address}`);
                } else {
                    await execAsync(`bluetoothctl pair ${device.address}`);
                    await execAsync(`bluetoothctl connect ${device.address}`);
                }
            }
        } catch (e) {
            console.error("Error al conectar/desconectar del dispositivo: ", e);
        }
    }

    const toggleBluetooth = async (state: boolean) => {
        try {
            if (state) {
                await execAsync("rfkill unblock bluetooth");
                await new Promise(resolve => setTimeout(resolve, 500));
                await execAsync("bluetoothctl power on");
            } else {
                bluetooth.toggle();
            }
        } catch (e) {
            console.error("Error al cambiar el estado del Bluetooth: ", e);
        }
    }

let isScanning = false;

const scanForDevices = async () => {
    try {
        if (!bluetooth.isPowered) {
            await execAsync("rfkill unblock bluetooth");
            await new Promise(resolve => setTimeout(resolve, 500));
            await execAsync("bluetoothctl power on");
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (isScanning) {
            return;
        }

        isScanning = true;

        const adapterInfo = await execAsync("bluetoothctl list");
        const match = adapterInfo.match(/Controller\s+([0-9A-F:]+)/i);

        if (!match) {
            throw new Error("No se encontró adaptador Bluetooth");
        }
        //Hay que eliminar esto
        const adapterAddress = match[1].replace(/:/g, '_');

        await execAsync(`dbus-send --system --type=method_call --dest=org.bluez /org/bluez/hci0 org.bluez.Adapter1.StartDiscovery`);

        setTimeout(async () => {
            try {
                await execAsync(`dbus-send --system --type=method_call --dest=org.bluez /org/bluez/hci0 org.bluez.Adapter1.StopDiscovery`);
            } catch (e) {
                console.error("Error al detener escaneo:", e);
            }
            isScanning = false;
        }, 10000);

    } catch (e) {
        console.error("Error al escanear dispositivos: ", e);
        isScanning = false;
    }
}

    return (
        <menubutton
            widthRequest={145}
            heightRequest={60}
            class={btBinding(p => p ? "active" : "")}
            direction={Gtk.ArrowType.LEFT}
        >
            <box spacing={8}>
                <label label={btBinding(p => p ? "󰂯" : "󰂲")}/>
                <label label={btBinding(p => p ? "Bluetooth" : "Apagado")}/>
            </box>
            <popover onMap={()=> setPopoverOpen(true)} onUnmap={()=> setPopoverOpen(false)}>
                <box orientation={Gtk.Orientation.VERTICAL} spacing={8} widthRequest={350}>
                    <box class="bluetooth-header">
                        <label
                            label="Bluetooth"
                            hexpand
                            halign={Gtk.Align.START}
                        />
                        <Gtk.Switch
                            active={btBinding(p => p)}
                            // @ts-ignore
                            onStateSet={(_, state) => {
                                toggleBluetooth(state);
                                return false;
                            }}
                        />
                    </box>

                    <Gtk.Separator/>

                    <Gtk.ScrolledWindow
                        vexpand
                        maxContentHeight={300}
                        propagateNaturalHeight
                    >
                        <With value={combinedBinding}>
                            {({powered, devs}) => (
                                <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                                    {!powered ? (
                                        <label label="El Bluetooth está apagado" class="empty-devices"/>
                                    ) : (
                                        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>

                                            <box halign={Gtk.Align.END}>
                                                <button
                                                    class="scan-button"
                                                    widthRequest={36}
                                                    heightRequest={36}
                                                    onClicked={scanForDevices}
                                                >
                                                    <Gtk.Image
                                                        iconName="view-refresh-symbolic"
                                                        pixelSize={18}
                                                        />
                                                </button>
                                            </box>


                                            {devs.length === 0 ? (
                                                <label label="No se encontraron dispositivos Bluetooth"
                                                       class="empty-devices"/>
                                            ) : (
                                                devs.map((device: any) => (
                                                    <button
                                                        class="device-item"
                                                        onClicked={() => connectToDevice(device)}
                                                    >
                                                        <box spacing={8} hexpand>
                                                            <label
                                                                label={device.connected ? "󰂱" : device.paired ? "󰂴" : "󰂯"}/>
                                                            <label
                                                                label={device.name || device.address}
                                                                hexpand
                                                                halign={Gtk.Align.START}
                                                            />
                                                            <label
                                                                label={device.connected ? "Conectado" : device.paired ? "Emparejado" : ""}
                                                                halign={Gtk.Align.END}
                                                            />
                                                        </box>
                                                    </button>
                                                ))
                                            )}
                                        </box>
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