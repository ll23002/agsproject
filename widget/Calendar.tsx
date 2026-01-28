import { createPoll } from "ags/time"
import { Gtk } from "ags/gtk4"
import GLib from "gi://GLib"

import {showWidget} from "../service/BarState";
import MediaPlayer from "./MediaPlayer";
import NotificacionesPanel from "./NotificacionesPanel";

export function Calendar() {

    const hora = createPoll("", 1000, () => {
        const now = GLib.DateTime.new_now_local();
        return now.format("%I:%M:%S %p") || "";
    });


    const innerContent = (
        <box spacing={12}>
            <menubutton hexpand halign={Gtk.Align.CENTER}>
                <label label={hora} widthRequest={100} halign={Gtk.Align.CENTER} />
                <popover>
                    <box spacing={12}>
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                            <MediaPlayer/>
                            <Gtk.Calendar
                                showDayNames
                                showHeading
                                css="padding: 12px;"
                            />
                        </box>
                        <NotificacionesPanel />
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