import { createBinding, With, createMemo } from "ags"
import { Gtk } from "ags/gtk4"
// @ts-ignore
import Wp from "gi://AstalWp"

export default function AudioPanel() {
    const wp = Wp.get_default();
    const audio = wp?.audio;

    if (!audio) return <box />;

    const speakersBinding = createBinding(audio, "speakers");
    const defaultSpeakerBinding = createBinding(audio, "defaultSpeaker");

    const combinedBinding = createMemo(() => ({
        speakers: speakersBinding(),
        defaultSpeaker: defaultSpeakerBinding(),
    }));

    const activeIcon = "\u{f028}";
    const inactiveIcon = "\u{f026}";
    const dropdownIcon = "\u{f0d7}";

    return (
        <box orientation={Gtk.Orientation.VERTICAL} spacing={8} class="audio-panel" css="padding: 5px;">
            <label
                label="Salida de Audio"
                halign={Gtk.Align.START}
                css="font-weight: bold; margin-bottom: 5px; color: #cdd6f4;"
            />
            <With value={combinedBinding}>
                {({ speakers, defaultSpeaker }) => {
                    const activeDevice = defaultSpeaker;

                    const activeDescBinding = activeDevice 
                        ? createBinding(activeDevice, "description")(d => d || "Sin dispositivo")
                        : "Sin dispositivo";

                    const staticActiveDesc = activeDevice?.description || "Sin dispositivo";

                    return (
                        <menubutton direction={Gtk.ArrowType.DOWN}>
                            <button
                                class="audio-select-button"
                                css="padding: 10px; border-radius: 8px; background-color: transparent; border: none; min-width: 260px;"
                            >
                                <box spacing={10}>
                                    <label
                                        label={activeIcon}
                                        css="font-family: 'JetBrainsMono Nerd Font', 'FiraCode Nerd Font'; color: #89b4fa;"
                                    />
                                    <label
                                        label={activeDescBinding}
                                        ellipsize={3}
                                        maxWidthChars={16}
                                        css="color: #cdd6f4;"
                                        hexpand
                                        halign={Gtk.Align.START}
                                    />
                                    <box hexpand />
                                    {activeDevice && (
                                        <label
                                            label={createBinding(activeDevice, "volume")(vol => `${Math.round(vol * 100)}%`)}
                                            css="font-size: 10px; color: #a6adc8;"
                                        />
                                    )}
                                    <label
                                        label={dropdownIcon}
                                        css="font-family: 'JetBrainsMono Nerd Font', 'FiraCode Nerd Font'; color: #89b4fa;"
                                    />
                                </box>
                            </button>
                            <popover>
                                <box orientation={Gtk.Orientation.VERTICAL} spacing={4} css="padding: 5px;">
                                    <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                                        {speakers.length === 0 ? (
                                            <label label="Sin dispositivos" css="padding: 8px; color: #a6adc8;" />
                                        ) : (
                                            speakers.map((speaker: any) => {
                                                const speakerDesc = speaker.description || "Dispositivo Desconocido";
                                                const isActive = speakerDesc === staticActiveDesc;
                                                return (
                                                    <button
                                                        class={isActive ? "active-option" : "select-option"}
                                                        onClicked={() => {
                                                            if (speaker !== defaultSpeaker) {
                                                                speaker.set_is_default(true);
                                                            }
                                                        }}
                                                        css={`
                                                            padding: 8px; border-radius: 6px;
                                                            ${isActive
                                                                ? 'background-color: rgba(137, 180, 250, 0.15);'
                                                                : 'background-color: transparent;'}
                                                        `}
                                                    >
                                                        <box spacing={8}>
                                                            <label
                                                                label={isActive ? activeIcon : inactiveIcon}
                                                                css={`font-family: 'JetBrainsMono Nerd Font', 'FiraCode Nerd Font'; color: ${isActive ? '#89b4fa' : '#a6adc8'};`}
                                                            />
                                                            <label
                                                                label={speakerDesc}
                                                                ellipsize={3}
                                                                hexpand
                                                                halign={Gtk.Align.START}
                                                                css={isActive ? "color: #cdd6f4;" : "color: #bac2de;"}
                                                            />
                                                        </box>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </box>
                                </box>
                            </popover>
                        </menubutton>
                    );
                }}
            </With>
        </box>
    );
}