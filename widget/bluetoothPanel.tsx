import {createBinding, With, createMemo} from "ags";
import {Gtk} from "ags/gtk4"
import GLib from "gi://GLib";
import GObject from "gi://GObject";
// @ts-ignore
import Bluetooth from "gi://AstalBluetooth";

class ScanningState extends GObject.Object {
    static {
        GObject.registerClass({
            GTypeName: "ScanningState",
            Properties: {
                "scanning": GObject.ParamSpec.boolean(
                    "scanning", "Scanning", "Is Scanning",
                    GObject.ParamFlags.READWRITE,
                    false
                ),
            },
        }, this);
    }

    #scanning = false;

    get scanning() {
        return this.#scanning;
    }

    set scanning(value: boolean) {
        if (this.#scanning !== value) {
            this.#scanning = value;
            this.notify("scanning");
        }
    }
}

export default function BluetoothPanel() {
    const bluetooth = Bluetooth.get_default();
    const btBinding = createBinding(bluetooth, "isPowered");
    const devices = createBinding(bluetooth, "devices");
    const scanningState = new ScanningState();
    const scanningBinding = createBinding(scanningState, "scanning");

    const combinedBinding = createMemo(() => ({
        powered: btBinding(),
        devs: devices(),
        scanning: scanningBinding()
    }));

    let scanTimeoutId: number | null = null;

    const connectToDevice = (device: any) => {
        if (!device || !device.address) {
            console.error("✗ Dispositivo no válido");
            return;
        }

        if (!bluetooth.isPowered && bluetooth.adapter) {
            bluetooth.adapter.set_powered(true);

            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                performDeviceAction(device);
                return GLib.SOURCE_REMOVE;
            });
        } else {
            performDeviceAction(device);
        }
    }

    const getErrorMessage = (error: any): string => {
        const errorStr = String(error);

        if (errorStr.includes("Page Timeout") || errorStr.includes("ConnectionAttemptFailed")) {
            return "Dispositivo fuera de rango o no disponible";
        } else if (errorStr.includes("AlreadyConnected")) {
            return "El dispositivo ya está conectado";
        } else if (errorStr.includes("NotReady")) {
            return "El dispositivo no está listo. Inténtalo de nuevo";
        } else if (errorStr.includes("InProgress")) {
            return "Operación ya en progreso";
        } else if (errorStr.includes("AuthenticationCanceled")) {
            return "Autenticación cancelada";
        } else if (errorStr.includes("AuthenticationFailed") || errorStr.includes("AuthenticationRejected")) {
            return "Autenticación fallida. Verifica el código PIN";
        } else if (errorStr.includes("AuthenticationTimeout")) {
            return "Tiempo de autenticación agotado";
        } else if (errorStr.includes("DoesNotExist") || errorStr.includes("UnknownObject")) {
            return "El dispositivo ya no está disponible";
        } else if (errorStr.includes("AlreadyExists")) {
            return "El dispositivo ya está emparejado";
        }

        return "Error desconocido";
    }

    const performDeviceAction = (device: any) => {
        if (device.connected) {
            try {
                device.disconnect_device((source: any, result: any) => {
                    try {
                        device.disconnect_device_finish(result);
                        console.log("✓ Dispositivo desconectado:", device.name);
                    } catch (e) {
                        const msg = getErrorMessage(e);
                        console.error("✗ Error al desconectar:", msg);
                    }
                });
            } catch (e) {
                const msg = getErrorMessage(e);
                console.error("✗ Error al desconectar:", msg);
            }
        } else if (device.paired) {
            try {
                device.connect_device((source: any, result: any) => {
                    try {
                        device.connect_device_finish(result);
                        console.log("✓ Dispositivo conectado:", device.name);
                    } catch (e) {
                        const msg = getErrorMessage(e);
                        console.error("✗ Error al conectar:", msg);
                    }
                });
            } catch (e) {
                const msg = getErrorMessage(e);
                console.error("✗ Error al conectar:", msg);
            }
        } else {
            try {
                device.pair();
                console.log("⟳ Emparejando dispositivo:", device.name);

                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
                    try {
                        device.connect_device((src: any, res: any) => {
                            try {
                                device.connect_device_finish(res);
                                console.log("✓ Conectado después de emparejar:", device.name);
                            } catch (e) {
                                const msg = getErrorMessage(e);
                                console.error("✗ Error al conectar después de emparejar:", msg);
                            }
                        });
                    } catch (e) {
                        const msg = getErrorMessage(e);
                        console.error("✗ Error al intentar conectar después de emparejar:", msg);
                    }
                    return GLib.SOURCE_REMOVE;
                });
            } catch (e) {
                const msg = getErrorMessage(e);
                console.error("✗ Error al emparejar:", msg);
            }
        }
    }

    const toggleBluetooth = (state: boolean) => {
        const adapter = bluetooth.adapter;
        if (!adapter) {
            console.error("No se encontró adaptador Bluetooth");
            return;
        }

        try {
            adapter.set_powered(state);
            if (!state && scanningState.scanning) {
                stopScanning();
            }
        } catch (e) {
            console.error("Error al cambiar el estado del Bluetooth:", e);
        }
    }

    const stopScanning = () => {
        try {
            const adapter = bluetooth.adapter;
            if (adapter && scanningState.scanning) {
                adapter.stop_discovery();
            }
        } catch (e) {
            console.error("Error al detener escaneo:", e);
        }
        scanningState.scanning = false;
        if (scanTimeoutId !== null) {
            GLib.source_remove(scanTimeoutId);
            scanTimeoutId = null;
        }
    }

    const scanForDevices = () => {
        const adapter = bluetooth.adapter;

        if (!adapter) {
            console.error("No se encontró adaptador Bluetooth");
            return;
        }

        if (!bluetooth.isPowered) {
            adapter.set_powered(true);
        }

        if (scanningState.scanning) {
            stopScanning();
            return;
        }

        try {
            scanningState.scanning = true;
            adapter.start_discovery();

            if (scanTimeoutId !== null) {
                GLib.source_remove(scanTimeoutId);
            }

            scanTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10000, () => {
                stopScanning();
                return GLib.SOURCE_REMOVE;
            });
        } catch (e) {
            console.error("Error al escanear dispositivos:", e);
            scanningState.scanning = false;
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
                <label label={btBinding(p => p ? "\u{f00af}" : "\u{f00b2}")}/>
                <label label={btBinding(p => p ? "Bluetooth" : "Apagado")}/>
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
                            {({powered, devs, scanning}) => (
                                <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                                    {!powered ? (
                                        <label label="El Bluetooth está apagado" class="empty-devices"/>
                                    ) : (
                                        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                                            <box halign={Gtk.Align.END}>
                                                <button
                                                    class={scanning ? "scan-button scanning" : "scan-button"}
                                                    widthRequest={36}
                                                    heightRequest={36}
                                                    onClicked={scanForDevices}
                                                    tooltip_text={scanning ? "Detener escaneo" : "Buscar dispositivos"}
                                                >
                                                    <label
                                                        label={scanning ? "\u{f04b9}" : "\u{f021}"}
                                                        css="font-size: 16px;"
                                                    />
                                                </button>
                                            </box>

                                            {devs.length === 0 ? (
                                                <label
                                                    label={scanning ? "Buscando dispositivos..." : "No se encontraron dispositivos Bluetooth"}
                                                    class="empty-devices"
                                                />
                                            ) : (
                                                devs.map((device: any) => (
                                                    <button
                                                        class="device-item"
                                                        onClicked={() => connectToDevice(device)}
                                                        tooltip_text={device.address}
                                                    >
                                                        <box spacing={8} hexpand>
                                                            <label
                                                                label={device.connected ? "\u{f00b1}" : device.paired ? "\u{f00b0}" : "\u{f00af}"}
                                                            />
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