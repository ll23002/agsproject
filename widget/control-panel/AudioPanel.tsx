import { createBinding, With, createMemo } from "ags"
import { Gtk } from "ags/gtk4"
import GObject from "gi://GObject"
// @ts-ignore
import Wp from "gi://AstalWp"

class AudioState extends GObject.Object {
    static {
        GObject.registerClass({
            GTypeName: "AudioState",
            Properties: {
                "activeDevice": GObject.ParamSpec.string(
                    "activeDevice", "Active Device", "Active Audio Device",
                    GObject.ParamFlags.READWRITE,
                    ""
                ),
            },
        }, this);
    }

    #activeDevice = "";

    get activeDevice() {
        return this.#activeDevice;
    }

    set activeDevice(value: string) {
        if (this.#activeDevice !== value) {
            this.#activeDevice = value;
            this.notify("activeDevice");
        }
    }
}

export default function AudioPanel() {
    const wp = Wp.get_default();
    const audio = wp?.audio;

    if (!audio) return <box />;

    const speakersBinding = createBinding(audio, "speakers");
    const defaultSpeakerBinding = createBinding(audio, "defaultSpeaker");
    const audioState = new AudioState();
    const activeDeviceBinding = createBinding(audioState, "activeDevice");

    const combinedBinding = createMemo(() => ({
        speakers: speakersBinding(),
        defaultSpeaker: defaultSpeakerBinding(),
        activeDeviceDesc: activeDeviceBinding(),
    }));

    const activeIcon = "\u{f028}";
    const inactiveIcon = "\u{f026}";
    const dropdownIcon = "\u{f0d7}";

    const getActiveDevice = (speakers: any[], defaultSpeaker: any) => {
        if (!speakers || speakers.length === 0) {
            return defaultSpeaker;
        }

        const bluetoothDevice = speakers.find((s: any) =>
            s.description?.toLowerCase().includes("bluetooth") ||
            s.name?.toLowerCase().includes("bluetooth")
        );

        return bluetoothDevice || defaultSpeaker;
    };

    const updateActiveDevice = (speakers: any[], defaultSpeaker: any) => {
        const active = getActiveDevice(speakers, defaultSpeaker);
        audioState.activeDevice = active?.description || "Sin dispositivo";
        return active;
    };

    return (
        <box orientation={Gtk.Orientation.VERTICAL} spacing={8} class="audio-panel" css="padding: 5px;">
            <label
                label="Salida de Audio"
                halign={Gtk.Align.START}
                css="font-weight: bold; margin-bottom: 5px; color: #cdd6f4;"
            /><With value={combinedBinding}>
                {({ speakers, defaultSpeaker }) => {
                    const activeDevice = updateActiveDevice(speakers, defaultSpeaker);

                    return (
                        <menubutton direction={Gtk.ArrowType.DOWN}>
                            <button
                                class="audio-select-button"
                                css="padding: 10px; border-radius: 8px; background-color: transparent; border: none;"
                            >
                                <box spacing={10}>
                                    <label
                                        label={activeIcon}
                                        css="font-family: 'JetBrainsMono Nerd Font', 'FiraCode Nerd Font'; color: #89b4fa;"
                                    />
                                    <label
                                        label={activeDevice?.description || "Sin dispositivo"}
                                        ellipsize={3}
                                        maxWidthChars={25}
                                        css="color: #cdd6f4;"
                                        hexpand
                                        halign={Gtk.Align.START}
                                    /><box hexpand />
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
                            </button><popover>
                                <box orientation={Gtk.Orientation.VERTICAL} spacing={4} css="padding: 5px;">
                                    <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                                        {speakers.length === 0 ? (
                                            <label label="Sin dispositivos" css="padding: 8px; color: #a6adc8;" />
                                        ) : (
                                            speakers.map((speaker: any) => (
                                                <button
                                                    class={speaker === activeDevice ? "active-option" : "select-option"}
                                                    onClicked={() => {
                                                        if (speaker !== defaultSpeaker) {
                                                            speaker.set_is_default(true);
                                                        }
                                                        audioState.activeDevice = speaker.description;
                                                    }}
                                                    css={`
                                                        padding: 8px; border-radius: 6px;
                                                        ${speaker === activeDevice
                                                            ? 'background-color: rgba(137, 180, 250, 0.15);'
                                                            : 'background-color: transparent;'}
                                                    `}
                                                >
                                                    <box spacing={8}>
                                                        <label
                                                            label={speaker === activeDevice ? activeIcon : inactiveIcon}
                                                            css={`font-family: 'JetBrainsMono Nerd Font', 'FiraCode Nerd Font'; color: ${speaker === activeDevice ? '#89b4fa' : '#a6adc8'};`}
                                                        />
                                                        <label
                                                            label={speaker.description || "Dispositivo Desconocido"}
                                                            ellipsize={3}
                                                            hexpand
                                                            halign={Gtk.Align.START}
                                                            css={speaker === activeDevice ? "color: #cdd6f4;" : "color: #bac2de;"}
                                                        />
                                                    </box>
                                                </button>
                                            ))
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