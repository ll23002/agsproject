import { Gtk } from "ags/gtk4";
import { createBinding, With } from "ags";
import {showWidget} from "../service/BarState";
//@ts-ignore
import Hyprland from "gi://AstalHyprland";

export function Workspaces() {
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

            <box
                class="ghost-killer"
                valign={Gtk.Align.START}
                halign={Gtk.Align.START}
            >
                <revealer
                    transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
                    revealChild={showWidget(v => v)}
                >
                    {innerContent}
                </revealer>
            </box>
    )
}