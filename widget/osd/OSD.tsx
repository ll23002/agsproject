import { Astal, Gtk, Gdk } from "ags/gtk4";
import { createBinding } from "ags";
import app from "ags/gtk4/app";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import Gio from "gi://Gio";
import { execAsync } from "ags/process";
// @ts-ignore
import Wp from "gi://AstalWp";
import Brightness from "../../service/Brightness";

class OsdState extends GObject.Object {
    static {
        GObject.registerClass({
            GTypeName: "OsdState",
            Properties: {
                "icon": GObject.ParamSpec.string("icon", "", "", GObject.ParamFlags.READWRITE, ""),
                "value": GObject.ParamSpec.float("value", "", "", GObject.ParamFlags.READWRITE, 0, 100, 0),
                "isCaps": GObject.ParamSpec.boolean("isCaps", "", "", GObject.ParamFlags.READWRITE, false),
                "isMic": GObject.ParamSpec.boolean("isMic", "", "", GObject.ParamFlags.READWRITE, false),
            }
        }, this);
    }
    #icon = "";
    #value = 0;
    #isCaps = false;
    #isMic = false;

    get icon() { return this.#icon; }
    set icon(val) { this.#icon = val; this.notify("icon"); }

    get value() { return this.#value; }
    set value(val) { this.#value = val; this.notify("value"); }

    get isCaps() { return this.#isCaps; }
    set isCaps(val) { this.#isCaps = val; this.notify("isCaps"); }

    get isMic() { return this.#isMic; }
    set isMic(val) { this.#isMic = val; this.notify("isMic"); }
}

const state = new OsdState();

export default function OSD(monitor: Gdk.Monitor) {
    let speaker: any = null;
    let mic: any = null;
    let wp: any = null;
    let timeoutIdMain: number | null = null;
    let timeoutIdMic: number | null = null;

    try {
        wp = Wp.get_default();
        if (wp) {
            speaker = wp.audio.defaultSpeaker;
            mic = wp.audio.defaultMicrophone;
        }
    } catch (e) {
        console.error("Wp not found for OSD", e);
    }

    const icon = createBinding(state, "icon");
    const val = createBinding(state, "value");
    const isCaps = createBinding(state, "isCaps");
    const isMic = createBinding(state, "isMic");

    // ------------- MAIN OSD (Volume, Brightness, Caps) -------------
    const winMain = (
        <window
            name={`osd-main-${monitor}`}
            namespace="osd"
            class="osd-window"
            gdkmonitor={monitor}
            layer={Astal.Layer.OVERLAY}
            exclusivity={Astal.Exclusivity.IGNORE}
            keymode={Astal.Keymode.NONE}
            visible={false}
            anchor={Astal.WindowAnchor.BOTTOM}
            application={app}
            css="background-color: transparent; margin-bottom: 60px;"
        >
            <box
                class="osd-container"
                css="background-color: rgba(17, 17, 27, 0.85); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 100px; padding: 12px 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);"
                spacing={16}
                valign={Gtk.Align.CENTER}
            >
                <Gtk.Image 
                    iconName={icon(i => i)} 
                    css="font-size: 24px; color: #89b4fa;" 
                />
                
                {/* Mode: Volume / Brightness (Shows the custom Box progress bar) */}
                <revealer
                    transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
                    revealChild={isCaps(c => !c)}
                >
                    <box spacing={16} valign={Gtk.Align.CENTER}>
                        <box class="progress-bg" css="min-width: 200px; min-height: 8px; background-color: rgba(255,255,255,0.1); border-radius: 4px;">
                            <box 
                                class="progress-fg" 
                                css={val(v => `min-width: ${Math.min(v, 1) * 200}px; min-height: 8px; background-color: #89b4fa; border-radius: 4px; transition: min-width 150ms ease-out;`)}
                                halign={Gtk.Align.START}
                            />
                        </box>
                        <label 
                            label={val(v => `${Math.floor(v * 100)}%`)} 
                            css="color: #cdd6f4; font-weight: bold; min-width: 40px;"
                        />
                    </box>
                </revealer>

                {/* Mode: CapsLock */}
                <revealer
                    transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
                    revealChild={isCaps(c => c)}
                >
                    <label 
                        label={val(v => v > 0 ? "MAYÚSCULAS ACTIVADAS" : "mayúsculas desactivadas")} 
                        css="color: #cdd6f4; font-weight: bold; min-width: 200px;"
                    />
                </revealer>
            </box>
        </window>
    ) as Astal.Window;

    // ------------- MIC OSD (Top anchor, pill shape) -------------
    const winMic = (
        <window
            name={`osd-mic-${monitor}`}
            namespace="osd-mic"
            class="osd-mic-window"
            gdkmonitor={monitor}
            layer={Astal.Layer.OVERLAY}
            exclusivity={Astal.Exclusivity.IGNORE}
            keymode={Astal.Keymode.NONE}
            visible={false}
            anchor={Astal.WindowAnchor.TOP}
            application={app}
            css="background-color: transparent; margin-top: 60px;"
        >
            <box
                class="osd-mic-container"
                css="background-color: rgba(17, 17, 27, 0.9); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 100px; padding: 10px 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);"
                spacing={12}
                valign={Gtk.Align.CENTER}
            >
                <Gtk.Image 
                    iconName={icon(i => i)} 
                    css={icon(i => `font-size: 20px; color: ${i === "microphone-disabled-symbolic" ? "#f38ba8" : "#a6e3a1"};`)} 
                />
                
                <label 
                    label={icon(i => i === "microphone-disabled-symbolic" ? "Micrófono Silenciado" : "Micrófono Activado")} 
                    css={icon(i => `font-weight: bold; min-width: 150px; color: ${i === "microphone-disabled-symbolic" ? "#f38ba8" : "#a6e3a1"};`)}
                />
            </box>
        </window>
    ) as Astal.Window;

    const showMainOSD = () => {
        winMain.visible = true;
        winMic.visible = false;
        if (timeoutIdMain) {
            GLib.source_remove(timeoutIdMain);
        }
        timeoutIdMain = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
            winMain.visible = false;
            timeoutIdMain = null;
            return GLib.SOURCE_REMOVE;
        });
    };

    const showMicOSD = () => {
        winMic.visible = true;
        winMain.visible = false;
        if (timeoutIdMic) {
            GLib.source_remove(timeoutIdMic);
        }
        timeoutIdMic = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
            winMic.visible = false;
            timeoutIdMic = null;
            return GLib.SOURCE_REMOVE;
        });
    };

    if (speaker) {
        speaker.connect("notify::volume", () => {
            state.icon = speaker.volumeIcon || "audio-volume-high-symbolic";
            state.value = speaker.volume;
            state.isCaps = false;
            state.isMic = false;
            showMainOSD();
        });
        speaker.connect("notify::mute", () => {
            state.icon = speaker.volumeIcon || "audio-volume-muted-symbolic";
            state.value = speaker.volume;
            state.isCaps = false;
            state.isMic = false;
            showMainOSD();
        });
    }

    if (mic) {
        mic.connect("notify::volume", () => {
            state.icon = mic.volumeIcon || "audio-input-microphone-symbolic";
            state.value = mic.volume;
            state.isCaps = false;
            state.isMic = true;
            showMicOSD();
        });
        mic.connect("notify::mute", () => {
            state.icon = mic.mute ? "microphone-disabled-symbolic" : "audio-input-microphone-symbolic";
            state.value = mic.volume;
            state.isCaps = false;
            state.isMic = true;
            showMicOSD();
        });
    }

    Brightness.connect("notify::screen", () => {
        state.icon = "display-brightness-symbolic";
        state.value = Brightness.screen;
        state.isCaps = false;
        state.isMic = false;
        showMainOSD();
    });

    // CapsLock Monitor
    try {
        execAsync("sh -c 'ls -w1 /sys/class/leds | grep capslock | head -1'").then(out => {
            const capsDevice = out.trim();
            if (capsDevice) {
                const capsPath = `/sys/class/leds/${capsDevice}/brightness`;
                const file = Gio.File.new_for_path(capsPath);
                const monitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
                
                // @ts-ignore
                winMain._capsMonitor = monitor; // Prevent GC

                monitor.connect("changed", async () => {
                    try {
                        const valStr = await execAsync(`cat ${capsPath}`);
                        const isLocked = valStr.trim() === "1";
                        if (state.isCaps !== isLocked) {
                            state.icon = isLocked ? "input-keyboard-symbolic" : "input-keyboard-symbolic";
                            state.value = isLocked ? 1 : 0;
                            state.isCaps = true;
                            state.isMic = false;
                            showMainOSD();
                        }
                    } catch (e) {}
                });
            }
        }).catch(() => {});
    } catch (e) {}

    // @ts-ignore
    winMain._speaker = speaker;
    // @ts-ignore
    winMain._mic = mic;
    // @ts-ignore
    winMain._wp = wp;

    // We can return an array of windows
    return [winMain, winMic] as any;
}
