import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process";
import GLib from "gi://GLib";
import { createBinding, With } from "ags"
import Gio from "gi://Gio";
import Pango from "gi://Pango";
//@ts-ignore
import Mpris from "gi://AstalMpris";


function getCachedCoverPath(url: string): string | null {
    if (!url) return null;

    const cacheDir = GLib.get_user_cache_dir() + "/ags/media-covers";
    const encoder = new TextEncoder();
    const urlBytes = encoder.encode(url);
    const safeName = GLib.base64_encode(urlBytes).replace(/[\/+=]/g, "");
    const destPath = `${cacheDir}/${safeName}.jpg`;

    if (GLib.file_test(destPath, GLib.FileTest.EXISTS)) {
        return destPath;
    }

    GLib.mkdir_with_parents(cacheDir, 0o755);

    let srcPath: string | null = null;
    if (url.startsWith("file://")) srcPath = url.substring(7);
    else if (url.startsWith("/")) srcPath = url;

    if (srcPath) {
        if (GLib.file_test(srcPath, GLib.FileTest.EXISTS)) {
            try {
                const srcFile = Gio.File.new_for_path(srcPath);
                const destFile = Gio.File.new_for_path(destPath);
                srcFile.copy(destFile, Gio.FileCopyFlags.OVERWRITE, null, null);
                return destPath;
            } catch (err) {
                console.error("GIO Copy Error:", err);
                return null;
            }
        }
    } else if (url.startsWith("http")) {
        execAsync(["curl", "-s", "-o", destPath, url])
            .catch(err => console.error("Curl Error:", err));
        return null;
    }

    return null;
}

function CoverArt({ player }: { player: Mpris.Player }) {
    const coverArt = createBinding(player, "coverArt");

    return (
        <box
            class="cover-art-area"
            valign={Gtk.Align.CENTER}
            halign={Gtk.Align.CENTER}
        >
            <Gtk.ScrolledWindow
                widthRequest={64}
                heightRequest={64}
                hscrollbarPolicy={Gtk.PolicyType.NEVER}
                vscrollbarPolicy={Gtk.PolicyType.NEVER}
                hexpand={false}
                vexpand={false}
                css="border-radius: 8px;"
            >
                <With value={coverArt}>
                    {(url) => {
                        const path = getCachedCoverPath(url);
                        return (
                            <Gtk.Picture
                                contentFit={Gtk.ContentFit.COVER}
                                file={path ? Gio.File.new_for_path(path) : null}
                            />
                        );
                    }}
                </With>
            </Gtk.ScrolledWindow>

        </box>
    );
}


function Visualizer({ player }: { player: Mpris.Player }) {
    const status = createBinding(player, "playbackStatus");
    return (
        <box class="visualizer-box" valign={Gtk.Align.CENTER}>
            {[1.2, 0.8, 1.1, 0.9, 1.3, 0.7, 0.3, 0.2, 0.1, 0.2].map((delay) => (
                <box valign={Gtk.Align.CENTER} vexpand={false}>
                    <label
                        class={status((s) =>
                            s === Mpris.PlaybackStatus.PLAYING ? "visualizer-bar playing" : "visualizer-bar"
                        )}
                        css={`animation-duration: ${delay}s;`}
                        valign={Gtk.Align.CENTER}
                        vexpand={false}
                    />
                </box>
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
            <CoverArt player={player} />

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
                    <button onClicked={() => player.previous()} visible={canGoPrev((c) => c)} class="ctrl-btn">
                        <label label={"\u{f048}"} />
                    </button>

                    <button onClicked={() => player.play_pause()} class="play-btn">
                        <label
                            label={status((s) => (s === Mpris.PlaybackStatus.PLAYING ? "\u{f04c}" : "\u{f04b}"))}
                            css="font-size: 18px;"
                        />
                    </button>

                    <Visualizer player={player} />

                    <button onClicked={() => player.next()} visible={canGoNext((c) => c)} class="ctrl-btn">
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
        <box class="media-player-container" visible={players((p) => p.length > 0)}>
            <With value={players}>
                {(ps) => {

                    const activePlayer = ps.find((p: Mpris.Player) => p.playbackStatus === Mpris.PlaybackStatus.PLAYING) || ps[0];
                    if (activePlayer) {
                        return <Player player={activePlayer} />;
                    }
                    return <box />;
                }}
            </With>
        </box>
    );
}