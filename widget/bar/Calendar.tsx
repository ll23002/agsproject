import { createPoll } from "ags/time"
import { Gtk } from "ags/gtk4"
import GLib from "gi://GLib"
import {showWidget} from "../../service/BarState";
import MediaPlayer from "../control-panel/MediaPlayer";
import NotificacionesPanel from "../notifications/NotificacionesPanel";

export function Calendar() {

    const hora = createPoll("", 1000, () => {
        const now = GLib.DateTime.new_now_local();
        return now.format("%I:%M:%S %p") || "";
    });

    const diaHdr = createPoll("", 1000, () => {
        const now = GLib.DateTime.new_now_local();
        return now.format("%d") || "";
    });

    const diaSemanaHdr = createPoll("", 1000, () => {
        const now = GLib.DateTime.new_now_local();
        return now.format("%A")?.toUpperCase() || "";
    });

    const mesAñoHdr = createPoll("", 1000, () => {
        const now = GLib.DateTime.new_now_local();
        return now.format("%B %Y") || "";
    });



    const innerContent = (
        <box spacing={12}>
            <menubutton hexpand halign={Gtk.Align.CENTER}>
                <label label={hora} widthRequest={100} halign={Gtk.Align.CENTER} />
                <popover>
                    <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                        <MediaPlayer/>
                        <box class="calendar-card" spacing={24}>
                            <box class="calendar-left-pane" orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                                <label label={diaHdr} class="calendar-huge-day" />
                                <label label={diaSemanaHdr} class="calendar-day-name" />
                            </box>
                            
                            <box class="calendar-right-pane" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                                <label label={mesAñoHdr} class="calendar-month-name" halign={Gtk.Align.START} />
                                <Gtk.Calendar
                                    showDayNames
                                    showHeading={false}
                                    class="calendar-widget"
                                />
                            </box>
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