import { createBinding, With } from "ags"
import { Gtk } from "ags/gtk4"
// @ts-ignore
import Notifd from "gi://AstalNotifd"

export default function NotificacionesPanel() {
    const notifd = Notifd.get_default();
    const notifications = createBinding(notifd, "notifications");

    return (
        <box orientation={Gtk.Orientation.VERTICAL} spacing={8} class="notification-center">
            <box class="notification-header">
                <label label={notifications((n) => `Notificaciones (${n.length})`)} hexpand />
                <button
                    class="clear-button"
                    onClicked={() => {
                        notifd.get_notifications().forEach((n: any) => n.dismiss());
                    }}
                >
                    <label label={"\u{f039f}"} />
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
                                notifs.map((notification: Notifd.Notification) => (
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
    );
}

