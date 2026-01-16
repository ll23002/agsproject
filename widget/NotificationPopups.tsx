import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
// @ts-ignore
import Notifd from "gi://AstalNotifd"
import GLib from "gi://GLib"
import Pango from "gi://Pango" // <--- ¡BIENVENIDO SR. PANGO!

function createNotificationWidget(n: any) {
    return (
        <box
            class="notification-popup"
            spacing={12}
            widthRequest={300}
            css="background-color: #1e1e2e; color: #cdd6f4; border: 1px solid #89b4fa; border-radius: 12px; padding: 15px; margin-bottom: 10px;"
        >
            {n.appIcon && (
                <Gtk.Image iconName={n.appIcon} iconSize={Gtk.IconSize.LARGE} />
            )}
            <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
                <label
                    label={n.summary}
                    halign={Gtk.Align.START}
                    css="font-weight: bold; font-size: 14px;"
                    // truncate <--- ESTO ERA EL ERROR
                    ellipsize={Pango.EllipsizeMode.END} // <--- ESTO ES LO CORRECTO
                    maxWidthChars={25}
                />
                {n.body && (
                    <label
                        label={n.body}
                        halign={Gtk.Align.START}
                        wrap
                        useMarkup
                        // truncate <--- ERROR
                        ellipsize={Pango.EllipsizeMode.END} // <--- CORRECTO
                        lines={2} // Limita a 2 líneas para que no sea un pergamino
                        maxWidthChars={35}
                    />
                )}
            </box>
        </box>
    ) as Gtk.Box;
}

export default function NotificationPopups(gdkmonitor: Gdk.Monitor) {
    const notifd = Notifd.get_default();

    const mainBox = (
        <box orientation={Gtk.Orientation.VERTICAL} spacing={10} />
    ) as Gtk.Box;

    // Creamos la ventana y la guardamos
    const win = (
        <window
            name="notifications-popup"
            gdkmonitor={gdkmonitor}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
            layer={Astal.Layer.OVERLAY}
            margin={20}
            visible={false}
        >
            {mainBox}
        </window>
    ) as Astal.Window;

    let activeNotifications = 0;

    const updateVisibility = () => {
        if (activeNotifications > 0) {
            win.visible = true;
        } else {
            win.visible = false;
        }
    };

    // @ts-ignore
    notifd.connect("notified", (_, id) => {
        if (notifd.dontDisturb) return;

        const n = notifd.get_notification(id);
        if (!n) return;

        const widget = createNotificationWidget(n);
        mainBox.append(widget);

        activeNotifications++;
        updateVisibility();

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
            if (widget.get_parent()) {
                mainBox.remove(widget);
                activeNotifications--;
                updateVisibility();
            }
            return false;
        });
    });

    return win;
}