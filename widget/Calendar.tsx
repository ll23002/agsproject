import { createPoll } from "ags/time"
import { createBinding, With } from "ags"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
// @ts-ignore
import Notifd from "gi://AstalNotifd"
// @ts-ignore
import Hyprland from "gi://AstalHyprland"; // <--- NECESARIO

import { showWidget, setHover, mouseService } from "./BarState"; // <--- mouseService AGREGADO

export default function Calendar(gdkmonitor: Gdk.Monitor) {
    // Lógica de la fecha
    const fecha = createPoll("", 1000, () => {
        const now = new Date();
        return now.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    });

    // Lógica de notificaciones
    const notifd = Notifd.get_default();
    const notifications = createBinding(notifd, "notifications");

    // @ts-ignore
    notifd.connect("notified", (_, id) => {
        const n = notifd.get_notification(id);
    });

    const { TOP } = Astal.WindowAnchor;

    // --- CORRECCIÓN IMPERATIVA (Igual que ControlPanel) ---

    // 1. Definimos el contenido INTERNO (JSX normal, SIN revealer)
    const innerContent = (
        <box spacing={12}>
            <menubutton hexpand halign={Gtk.Align.CENTER}>
                <label label={fecha} />
                <popover>
                    <box spacing={12}>
                        <Gtk.Calendar showDayNames showHeading />
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={8} class="notification-center">
                            <box class="notification-header">
                                <label label={notifications((n) => `Notificaciones (${n.length})`)} hexpand />
                                <button
                                    class="clear-button"
                                    onClicked={() => {
                                        notifd.get_notifications().forEach((n: any) => n.dismiss());
                                    }}
                                >
                                    <Gtk.Image iconName="user-trash-symbolic" />
                                </button>
                            </box>
                            <Gtk.ScrolledWindow
                                vexpand
                                maxContentHeight={400}
                                propagateNaturalHeight
                            >
                                <With value={notifications}>
                                    {(notifs) => (
                                        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                                            {notifs.length === 0 ? (
                                                <label label="No hay notificaciones"
                                                       class="empty-notifications" />
                                            ) : (
                                                // @ts-ignore
                                                notifs.map(notification => (
                                                    <box class="notification" spacing={8}>
                                                        {notification.appIcon && (
                                                            <Gtk.Image iconName={notification.appIcon} />
                                                        )}
                                                        <box orientation={Gtk.Orientation.VERTICAL}>
                                                            <label label={notification.summary}
                                                                   halign={Gtk.Align.START} />
                                                            {notification.body && (
                                                                <label label={notification.body}
                                                                       halign={Gtk.Align.START} wrap />
                                                            )}
                                                        </box>
                                                    </box>
                                                ))
                                            )}
                                        </box>
                                    )}
                                </With>
                            </Gtk.ScrolledWindow>
                        </box>
                    </box>
                </popover>
            </menubutton>
        </box>
    );

    // 2. Creamos el Revealer MANUALMENTE
    const revealer = new Gtk.Revealer({
        transitionType: Gtk.RevealerTransitionType.SLIDE_DOWN,
        child: innerContent,
    });

    // 3. LOGICA DE REACTIVIDAD MANUAL
    const updateState = () => {
        const shouldShow = showWidget(); // Leemos el estado
        revealer.reveal_child = shouldShow; // Aplicamos
    };

    const hypr = Hyprland.get_default();
    hypr.connect("notify::focused-client", updateState); // Escuchamos a Hyprland
    mouseService.connect("notify::hovered", updateState); // Escuchamos al Mouse

    // Ejecutar una vez al inicio
    updateState();

    // 4. Creamos la caja MANUALMENTE (SIN CSS para evitar crash)
    const mainBox = new Gtk.Box({});

    // 5. Añadimos el controlador del mouse
    const controller = new Gtk.EventControllerMotion();
    controller.connect("enter", () => setHover(true));
    controller.connect("leave", () => setHover(false));
    mainBox.add_controller(controller);

    // 6. Metemos el revealer en la caja
    mainBox.append(revealer);

    // 7. Retornamos la ventana
    return (
        <window
            visible
            name="calendar"
            class="Calendar"
            gdkmonitor={gdkmonitor}
            exclusivity={Astal.Exclusivity.NORMAL}
            layer={Astal.Layer.OVERLAY}
            anchor={TOP}
            application={app}
            marginTop={12}
        >
            {mainBox}
        </window>
    );
}