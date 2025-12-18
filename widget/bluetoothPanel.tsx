import { createBinding, With } from "ags"
import { Gtk } from "ags/gtk4"
// @ts-ignore
import Bluetooth from "gi://AstalBluetooth"
import { execAsync } from "ags/process"

export default function BluetoothPanel() {
    const bluetooth = Bluetooth.get_default();
    const btBinding = createBinding(bluetooth, "isPowered");
    const devices = createBinding(bluetooth, "devices");

    const connectToDevice = async (device: any) => {
        try {
            if (device.connected) {
                await execAsync(`bluetoothctl disconnect ${device.address}`);
            } else {
                // Asegurarse de que el bluetooth esté encendido
                if (!bluetooth.isPowered) {
                    await execAsync("rfkill unblock bluetooth");
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await execAsync("bluetoothctl power on");
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // Si el dispositivo está emparejado, solo conectar
                if (device.paired) {
                    await execAsync(`bluetoothctl connect ${device.address}`);
                } else {
                    // Emparejar y conectar
                    await execAsync(`bluetoothctl pair ${device.address}`);
                    await execAsync(`bluetoothctl connect ${device.address}`);
                }
            }
        } catch (e) {
            console.error("Error al conectar/desconectar dispositivo:", e);
        }
    };

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
            console.error("Error al cambiar estado de Bluetooth:", e);
        }
    };

    return (
        <menubutton hexpand widthRequest={145} heightRequest={60} direction={Gtk.ArrowType.LEFT}>
            <box spacing={8}>
                <label label={btBinding(p => p ? "󰂯" : "󰂲")} />
                <label label={btBinding(p => p ? "Bluetooth" : "Apagado")} />
            </box>
            <popover>
                <box orientation={Gtk.Orientation.VERTICAL} spacing={8} widthRequest={350}>
                    <box class="bluetooth-header">
                        <label
                            label="Bluetooth"
                            hexpand
                            halign={Gtk.Align.START}
                        />
                        <Gtk.Switch
                            active={btBinding(p => p)}
                            onStateSet={(_, state) => {
                                toggleBluetooth(state);
                                return false;
                            }}
                        />
                    </box>

                    <Gtk.Separator />

                    <Gtk.ScrolledWindow
                        vexpand
                        maxContentHeight={300}
                        propagateNaturalHeight
                    >
                        <With value={devices}>
                            {(devs) => (
                                <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                                    {devs.length === 0 ? (
                                        <label label="No hay dispositivos disponibles" class="empty-devices" />
                                    ) : (
                                        devs.map((device: any) => (
                                            <button
                                                class="device-item"
                                                onClicked={() => connectToDevice(device)}
                                            >
                                                <box spacing={8}>
                                                    <label label={device.connected ? "󰂱" : device.paired ? "󰂴" : "󰂯"} />
                                                    <label label={device.name || device.address} hexpand halign={Gtk.Align.START} />
                                                    <label label={device.connected ? "Conectado" : device.paired ? "Emparejado" : ""} />
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