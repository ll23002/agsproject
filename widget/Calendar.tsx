import { createPoll } from "ags/time"
import { createBinding, With } from "ags"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
// @ts-ignore
import Notifd from "gi://AstalNotifd"
// @ts-ignore
import Hyprland from "gi://AstalHyprland";
import GLib from "gi://GLib"

import {showWidget, setPopoverOpen} from "../service/BarState";
import MediaPlayer from "./MediaPlayer";

export function Calendar() {

    const hora = createPoll("", 1000, () => {
        const now = GLib.DateTime.new_now_local();
        return now.format("%I:%M:%S %p") || "";
    });

    const notifd = Notifd.get_default();
    const notifications = createBinding(notifd, "notifications");

    notifd.connect("notified", (_: Notifd.Notifd, id: number) => {
        const n = notifd.get_notification(id);
    });

    const { TOP, RIGHT, LEFT } = Astal.WindowAnchor;

    const innerContent = (
        <box spacing={12}>
            <menubutton hexpand halign={Gtk.Align.CENTER}>
                <label label={hora} widthRequest={100} halign={Gtk.Align.CENTER} />
                <popover onMap={()=> setPopoverOpen(true)} onUnmap={()=> setPopoverOpen(false)}>
                    <box spacing={12}>
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                            <MediaPlayer/>
                            <Gtk.Calendar
                                showDayNames
                                showHeading
                                css="padding: 12px;"
                            />
                        </box>
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
                    </box>
                </popover>
            </menubutton>
        </box>
    );


    return (

            <box
                class="ghost-killer"
                valign={Gtk.Align.START}
                halign={Gtk.Align.CENTER}
            >
                <revealer
                    transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
                    revealChild={showWidget(v => v)}
                >
                    {innerContent}
                </revealer>
            </box>
    );
}