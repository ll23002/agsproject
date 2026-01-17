import { Astal, Gtk, Gdk } from "ags/gtk4";
import { createBinding, With } from "ags";
import app from "ags/gtk4/app";
//@ts-ignore
import Hyprland from "gi://AstalHyprland";
import {showWidget, setHover, mouseService, setPopoverOpen } from "./BarState";

export default function Workspaces(gdkmonitor: Gdk.Monitor) {
    const { TOP, LEFT} = Astal.WindowAnchor;
    const hypr = Hyprland.get_default()

    const workspaces = createBinding(hypr, "workspaces");
    const focusedWorkspace = createBinding(hypr, "focusedWorkspace");

    const innerContent = (
        <box class="workspaces" spacing={8}>
            <With value={workspaces}>
                {(wss) => {
                    const sorted = wss
                        // @ts-ignore
                        .filter(ws => ws.id > 0)
                        // @ts-ignore
                        .sort((a, b) => a.id - b.id)

                    return (
                        <box spacing={8}>
                            {
                                //@ts-ignore
                                sorted.map(ws => (
                                <With value={focusedWorkspace}>
                                    {(fw) => (
                                        <button
                                            class={fw?.id === ws.id ? "workspace-btn active" : "workspace-btn"}
                                            onClicked={() => ws.focus()}>
                                            <label
                                                label={ws.id.toString()}
                                                valign={Gtk.Align.CENTER}
                                                halign={Gtk.Align.CENTER}
                                                />
                                        </button>
                                    )}
                                </With>
                            ))}
                        </box>
                    )
                }}
            </With>
        </box>
    )


    const revealer = new Gtk.Revealer({
        transitionType: Gtk.RevealerTransitionType.SLIDE_DOWN,
        // @ts-ignore
        child: innerContent,
    })

    const updateState = () => {
        const shouldShow = showWidget();
        revealer.reveal_child = shouldShow;
    }

    hypr.connect("notify::focused-client", updateState);
    mouseService.connect("notify::hovered", updateState);
    mouseService.connect("notify::popover_open", updateState);
    mouseService.connect("notify::workspaces", updateState);

    updateState()


    const mainBox = new Gtk.Box({
        valign: Gtk.Align.START,
    })

    let hoverTimeout: any = null;
    const cancelHoverTimeout = () => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
    }

    const controller = new Gtk.EventControllerMotion()


    controller.connect("enter", () => {
        cancelHoverTimeout();
        setHover(true)
    })

    controller.connect("leave", () => {
        cancelHoverTimeout();

        hoverTimeout = setTimeout(() => {
            setHover(false)
        }, 150)
    })

    mainBox.add_controller(controller)
    mainBox.add_css_class("ghost-killer")
    mainBox.append(revealer)


    return (
        <window
            visible
            name="workspaces"
            class="Workspaces"
            gdkmonitor={gdkmonitor}
            exclusivity={Astal.Exclusivity.NORMAL}
            layer={Astal.Layer.OVERLAY}
            anchor={TOP | LEFT}
            application={app}
            css="background-color: transparent;"
        >
            {mainBox}
        </window>
    )
}