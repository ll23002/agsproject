import { Astal, Gtk, Gdk } from "ags/gtk4";
import { createBinding, With } from "ags";
import app from "ags/gtk4/app";
//@ts-ignore
import Hyprland from "gi://AstalHyprland";
import {showWidget} from "../service/BarState";

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
            <box css="background-color: transparent;">
                <revealer
                    transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
                    revealChild={showWidget(v => v)} // ¡Magia reactiva!
                >
                    {innerContent}
                </revealer>
            </box>
        </window>
    )
}