import { Astal, Gtk } from "ags/gtk4";
import { createBinding, With } from "ags";
//@ts-ignore
import Mpris from "gi://AstalMpris";
//@ts-ignore
import Pango from "gi://Pango";

function Visualizer({ player }: { player: Mpris.Player }) {
    const status = createBinding(player, "playbackStatus");

    return (
        <box class="visualizer-box" valign={Gtk.Align.END}>
            {[1.2, 0.8, 1.1, 0.9, 1.3, 0.7].map((delay) => (
                <label
                    class={status((s) =>
                        s === Mpris.PlaybackStatus.PLAYING
                            ? "visualizer-bar playing"
                            : "visualizer-bar"
                    )}
                    css={`animation-duration: ${delay}s;`}
                    valign={Gtk.Align.END}
                    vexpand={false}
                />
            ))}
        </box>
    );
}

function Player({ player }: { player: Mpris.Player }) {
    const title = createBinding(player, "title");
    const artist = createBinding(player, "artist");
    const status = createBinding(player, "playbackStatus");
    const canGoPrev = createBinding(player, "canGoPrevious");
    const canGoNext = createBinding(player, "canGoNext");

    return (
        <box class="media-player" spacing={12}>
            <box
                class="cover-art-area"
                widthRequest={64}
                heightRequest={64}
                valign={Gtk.Align.CENTER}
                halign={Gtk.Align.CENTER}
            >

                <Visualizer player={player} />
            </box>

            <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} hexpand>
                <label
                    class="title"
                    label={title((t) => t || "Desconocido")}
                    halign={Gtk.Align.START}
                    ellipsize={Pango.EllipsizeMode.END}
                    maxWidthChars={20}
                />

                <label
                    class="artist"
                    label={artist((a) => a || "Artista desconocido")}
                    halign={Gtk.Align.START}
                    ellipsize={Pango.EllipsizeMode.END}
                    maxWidthChars={20}
                />

                <box class="controls" spacing={10} marginTop={8}>
                    <button
                        onClicked={() => player.previous()}
                        visible={canGoPrev((c) => c)}
                        class="ctrl-btn"
                    >
                        <label label={"\u{f048}"} />
                    </button>

                    <button
                        onClicked={() => player.play_pause()}
                        class="play-btn"
                    >
                        <label
                            label={status((s) =>
                                s === Mpris.PlaybackStatus.PLAYING
                                    ? "\u{f04c}"
                                    : "\u{f04b}"
                            )}
                            css="font-size: 18px;"
                        />
                    </button>

                    <button
                        onClicked={() => player.next()}
                        visible={canGoNext((c) => c)}
                        class="ctrl-btn"
                    >
                        <label label={"\u{f051}"} />
                    </button>
                </box>
            </box>
        </box>
    ) as Gtk.Box;
}

export default function MediaPlayer() {
    const mpris = Mpris.get_default();
    const players = createBinding(mpris, "players");

    return (
        <box
            class="media-player-container"
            visible={players((p) => p.length > 0)}
        >
            <With value={players}>
                {(ps) => {
                    //@ts-ignore
                    const activePlayer = ps.find((p) => p.playbackStatus === Mpris.PlaybackStatus.PLAYING) || ps[0];
                    if (activePlayer) {
                        return <Player player={activePlayer} />;
                    }
                    return <box />;
                }}
            </With>
        </box>
    );
}