import { createPoll } from "ags/time"
import { createBinding, With } from "ags"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
// @ts-ignore
import Notifd from "gi://AstalNotifd"
// @ts-ignore
import Hyprland from "gi://AstalHyprland";
import GLib from "gi://GLib"

import {showWidget, setHover, mouseService, setPopoverOpen} from "../service/BarState";
import MediaPlayer from "./MediaPlayer";

export default function Calendar(gdkmonitor: Gdk.Monitor) {

    const hora = createPoll("", 1000, () => {
        const now = GLib.DateTime.new_now_local();
        return now.format("%I:%M:%S %p") || "";
    });

    const notifd = Notifd.get_default();
    const notifications = createBinding(notifd, "notifications");

    notifd.connect("notified", (_: Notifd.Notifd, id: number) => {
        const n = notifd.get_notification(id);
    });

    const { TOP } = Astal.WindowAnchor;

    const innerContent = (
        <box spacing={12}>
            <menubutton hexpand halign={Gtk.Align.CENTER}>
                <label label={hora} widthRequest={100} halign={Gtk.Align.CENTER} />
                <popover onMap={()=> setPopoverOpen(true)} onUnmap={()=> setPopoverOpen(false)}>
                    <box spacing={12}>
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                            <MediaPlayer/>
                            <Gtk.Calendar showDayNames showHeading />
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



    const revealer = (
        <revealer transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}>
            {innerContent}
        </revealer>
    ) as Gtk.Revealer;


    const updateState = () => {
        const shouldShow = showWidget();
        revealer.reveal_child = shouldShow;
    };

    const hypr = Hyprland.get_default();

    hypr.connect("notify::focused-client", updateState);
    mouseService.connect("notify::hovered", updateState);
    mouseService.connect("notify::popover_open", updateState);

    updateState();

    const mainBox = new Gtk.Box({
        valign: Gtk.Align.START,
    });

    let hoverTimeout: any = null;
    const cancelHoverTimeout = () => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
    };

    const controller = new Gtk.EventControllerMotion();

    controller.connect("enter", () => {
        cancelHoverTimeout();
        setHover(true);
    });

    controller.connect("leave", () => {
        cancelHoverTimeout();

        hoverTimeout = setTimeout(() => {
            setHover(false);
        }, 400);
    });

    mainBox.add_controller(controller);
    mainBox.add_css_class("ghost-killer");
    mainBox.append(revealer);

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
        >
            {mainBox}
        </window>
    );
}