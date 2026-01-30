// @ts-ignore
import Notifd from "gi://AstalNotifd"
import GLib from "gi://GLib"
import Pango from "gi://Pango"
import { Astal, Gtk, Gdk } from "ags/gtk4"

function createNotificationWidget(n: any) {

    let iconWidget;

    if (n.image && GLib.file_test(n.image, GLib.FileTest.EXISTS)) {
        iconWidget = (
            <Gtk.Image
                file={n.image}
                pixelSize={48}
                valign={Gtk.Align.START}
            />
        );
    }
    else if (n.appIcon) {
        iconWidget = (
            <Gtk.Image
                iconName={n.appIcon}
                pixelSize={48}
                valign={Gtk.Align.START}
            />
        );
    }
    else {
        iconWidget = (
            <Gtk.Image
                iconName="dialog-information-symbolic"
                pixelSize={48}
                valign={Gtk.Align.START}
            />
        );
    }

    return (
        <box
            class="notification-popup"
            spacing={12}
            widthRequest={300}
            css="background-color: #1e1e2e; color: #cdd6f4; border: 1px solid #89b4fa; border-radius: 12px; padding: 15px; margin-bottom: 10px;"
        >
            {iconWidget}

            <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
                <label
                    label={n.summary}
                    halign={Gtk.Align.START}
                    css="font-weight: bold; font-size: 14px;"
                    ellipsize={Pango.EllipsizeMode.END}
                    maxWidthChars={25}
                />
                {n.body && (
                    <label
                        label={n.body}
                        halign={Gtk.Align.START}
                        wrap
                        useMarkup
                        ellipsize={Pango.EllipsizeMode.END}
                        lines={2}
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

    const win = (
        <window
            name="notifications-popup"
            gdkmonitor={gdkmonitor}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
            layer={Astal.Layer.OVERLAY}
            margin={20}
            visible={false}
            css="background-color: transparent;"
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


        if (n.soundFile && GLib.file_test(n.soundFile, GLib.FileTest.EXISTS)) {
            GLib.spawn_command_line_async(`paplay "${n.soundFile}"`);
        }
        else {
            GLib.spawn_command_line_async("paplay /usr/share/sounds/freedesktop/stereo/arp-elegant.mp3");
        }

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
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