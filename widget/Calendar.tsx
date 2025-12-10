import { createPoll } from "ags/time"
import { createBinding, With } from "ags"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import Notifd from "gi://AstalNotifd"

export default function Calendar(gdkmonitor: Gdk.Monitor) {
    const fecha = createPoll("", 1000, () => {
        const now = new Date();
        return now.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    });

    const notifd = Notifd.get_default();

    // Crear binding reactivo a la propiedad notifications
    const notifications = createBinding(notifd, "notifications");

    console.log("Notificaciones al iniciar:", notifd.get_notifications().length);

    notifd.connect("notified", (_, id) => {
        console.log("Nueva notificación recibida! ID:", id);
        const n = notifd.get_notification(id);
        console.log("Summary:", n.summary, "Body:", n.body);
    });

    const { TOP } = Astal.WindowAnchor;

    return <window
        visible
        name="calendar"
        class="Calendar"
        gdkmonitor={gdkmonitor}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        anchor={TOP}
        application={app}
    >
        <box spacing={12}>
            <menubutton hexpand halign={Gtk.Align.CENTER}>
                <label label={fecha} />
                <popover>
                    <box spacing={12}>
                        <Gtk.Calendar showDayNames showHeading />
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={8} class="notification-center">
                            <box class="notification-header">
                                <label label={notifications((n) => `Notificaciones (${n.length})`)} />
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
                                                <label label="No hay notificaciones" />
                                            ) : (
                                                notifs.map(notification => (
                                                    <box class="notification" spacing={8}>
                                                        {notification.appIcon && (
                                                            <icon icon={notification.appIcon} />
                                                        )}
                                                        <box orientation={Gtk.Orientation.VERTICAL}>
                                                            <label label={notification.summary} halign={Gtk.Align.START} />
                                                            {notification.body && (
                                                                <label label={notification.body} halign={Gtk.Align.START} wrap />
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
    </window>
}