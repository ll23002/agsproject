import { createBinding, With } from "ags"
import { Gtk } from "ags/gtk4"
// @ts-ignore
import Wp from "gi://AstalWp"

export default function AudioPanel() {
    const wp = Wp.get_default();
    const audio = wp?.audio;

    if (!audio) return <box />;

    const speakersBinding = createBinding(audio, "speakers");
    const defaultSpeakerBinding = createBinding(audio, "defaultSpeaker");

    const activeIcon = "\u{f028}"; // nf-fa-volume_up
    const inactiveIcon = "\u{f026}"; // nf-fa-volume_off

    return (
        <box orientation={Gtk.Orientation.VERTICAL} spacing={8} class="audio-panel" css="padding: 5px;">
            <label
                label="Salidas de Audio"
                halign={Gtk.Align.START}
                css="font-weight: bold; margin-bottom: 5px; color: #cdd6f4;"
            />
            <With value={speakersBinding}>
                {(speakers: any[]) => (
                    <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                        {speakers.length === 0 ? (
                            <label label="Sin dispositivos de salida" class="empty-devices" />
                        ) : (
                            speakers.map((speaker: any) => (
                                <button
                                    class={defaultSpeakerBinding(def => (def === speaker ? "active-device" : "device-item"))}
                                    onClicked={() => {
                                        if (audio.defaultSpeaker !== speaker) {
                                            speaker.set_is_default(true);
                                        }
                                    }}
                                    css={defaultSpeakerBinding(def => `
                                        padding: 8px; border-radius: 8px;
                                        ${def === speaker ? 'background-color: rgba(137, 180, 250, 0.2); border: 1px solid #89b4fa;' : 'background-color: transparent; border: 1px solid transparent;'}
                                    `)}
                                >
                                    <box spacing={10}>
                                        <label
                                            label={defaultSpeakerBinding(def => (def === speaker ? activeIcon : inactiveIcon))}
                                            css={defaultSpeakerBinding(def => `font-family: 'JetBrainsMono Nerd Font', 'FiraCode Nerd Font'; ${def === speaker ? 'color: #89b4fa;' : 'color: #a6adc8;'}`)}
                                        />
                                        <label
                                            label={speaker.description || "Dispositivo Desconocido"}
                                            ellipsize={3} // Pango.EllipsizeMode.END
                                            maxWidthChars={20}
                                            css={defaultSpeakerBinding(def => def === speaker ? "color: #cdd6f4;" : "color: #bac2de;")}
                                        />
                                        <box hexpand />
                                        {/* Optional volume indicator */}
                                        <label
                                            label={createBinding(speaker, "volume")(vol => `${Math.round(vol * 100)}%`)}
                                            css="font-size: 10px; color: #a6adc8;"
                                        />
                                    </box>
                                </button>
                            ))
                        )}
                    </box>
                )}
            </With>
        </box>
    );
}
