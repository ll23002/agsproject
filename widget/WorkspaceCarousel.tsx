import { Astal, Gtk, Gdk } from "ags/gtk4";
import { createBinding, With } from "ags";
import GObject from "gi://GObject";
import Gio from "gi://Gio";
import app from "ags/gtk4/app";
// @ts-ignore
import Hyprland from "gi://AstalHyprland";
import PreviewService from "../service/WorkspaceReview";

class WorkspaceCarouselService extends GObject.Object {
    static {
        GObject.registerClass({
            Properties: {
                'selectedIndex': GObject.ParamSpec.int(
                    'selectedIndex', 'SelectedIndex', 'Currently selected workspace index',
                    GObject.ParamFlags.READWRITE,
                    -1, 999, 0
                ),
            },
        }, this);
    }

    declare selectedIndex: number;

    cycle(step: number, maxIndex: number) {
        let next = this.selectedIndex + step;
        if (next > maxIndex) next = 0;
        if (next < 0) next = maxIndex;
        this.selectedIndex = next;
    }

    resetToFocused(focusedId: number, sortedWorkspaces: any[]) {
        const index = sortedWorkspaces.findIndex((ws: any) => ws.id === focusedId);
        this.selectedIndex = index >= 0 ? index : 0;
    }
}

const carouselService = new WorkspaceCarouselService();

class WorkspaceImageState extends GObject.Object {
    static {
        GObject.registerClass({
            GTypeName: "WorkspaceImageState",
            Properties: {
                "path": GObject.ParamSpec.string(
                    "path", "Path", "Image Path",
                    GObject.ParamFlags.READWRITE,
                    null
                ),
            },
        }, this);
    }

    #path: string | null = null;
    #id: number;
    #signalId: number;

    get path() {
        return this.#path;
    }

    set path(value: string | null) {
        if (this.#path !== value) {
            this.#path = value;
            this.notify("path");
        }
    }

    constructor(id: number) {
        super();
        this.#id = id;

        this.updatePath();

        this.#signalId = PreviewService.connect("preview-updated", (_: any, updatedId: number) => {
            if (updatedId === this.#id) {
                this.updatePath();
            }
        });
    }

    updatePath() {
        this.path = PreviewService.getPreviewPath(this.#id);
    }


}

function PreviewImage({ id }: { id: number }) {
    const imageState = new WorkspaceImageState(id);
    const pathBinding = createBinding(imageState, "path");

    return (
        <With value={pathBinding}>
            {(path) => (
                <Gtk.Picture
                    contentFit={Gtk.ContentFit.COVER}
                    widthRequest={320}
                    heightRequest={180}
                    file={path ? Gio.File.new_for_path(path) : null}
                />
            )}
        </With>
    );
}




function WorkspaceCard({ ws, index }: { ws: any; index: number }) {
    const hypr = Hyprland.get_default();
    const selectedIndex = createBinding(carouselService, "selectedIndex");

    return (
        <button
            class={selectedIndex(idx => {
                const isFocused = hypr.get_focused_workspace().id === ws.id;
                const isSelected = idx === index;
                if (isFocused) return "ws-preview-card active";
                if (isSelected) return "ws-preview-card selected";
                return "ws-preview-card";
            })}
            onClicked={() => {
                hypr.dispatch("workspace", String(ws.id));
                app.toggle_window("workspace-carousel");
            }}
        >
            <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <box class="image-container">
                    <PreviewImage id={ws.id} />
                </box>
                <label
                    label={`Workspace ${ws.id}`}
                    css="font-weight: bold; font-size: 16px;"
                />
            </box>
        </button>
    );
}



export default function WorkspaceCarousel(gdkmonitor: Gdk.Monitor) {
    const hypr = Hyprland.get_default();
    const workspaces = createBinding(hypr, "workspaces");
    const hide = () => app.toggle_window("workspace-carousel");

    const keyController = new Gtk.EventControllerKey();

    keyController.connect("key-pressed", (_: Gtk.EventControllerKey, keyval: number) => {
        const sortedWorkspaces = hypr.get_workspaces()
            .filter((w: any) => w.id > 0)
            .sort((a: any, b: any) => a.id - b.id);

        const maxIndex = sortedWorkspaces.length - 1;

        if (keyval === Gdk.KEY_Escape) {
            hide();
            return true;
        }
        if (keyval === Gdk.KEY_Left || keyval === Gdk.KEY_Up) {
            carouselService.cycle(-1, maxIndex);
            return true;
        }
        if (keyval === Gdk.KEY_Right || keyval === Gdk.KEY_Down) {
            carouselService.cycle(1, maxIndex);
            return true;
        }
        if (keyval === Gdk.KEY_Return) {
            const selectedWs = sortedWorkspaces[carouselService.selectedIndex];
            if (selectedWs) {
                hypr.dispatch("workspace", String(selectedWs.id));
                hide();
            }
            return true;
        }
        return false;
    });

    const win = (
        <window
            name="workspace-carousel"
            visible={false}
            gdkmonitor={gdkmonitor}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
            layer={Astal.Layer.OVERLAY}
            exclusivity={Astal.Exclusivity.IGNORE}
            keymode={Astal.Keymode.EXCLUSIVE}
            application={app}
            css="background-color: transparent;"
            onShow={() => {
                const sortedWorkspaces = hypr.get_workspaces()
                    .filter((w: any) => w.id > 0)
                    .sort((a: any, b: any) => a.id - b.id);
                carouselService.resetToFocused(hypr.get_focused_workspace().id, sortedWorkspaces);
            }}
        >
            <box css="padding: 20px;">
                <box class="carousel-container" orientation={Gtk.Orientation.VERTICAL} spacing={16}>
                    <label label="Resumen de Workspaces" css="font-size: 24px; font-weight: bold; color: #cdd6f4;" />

                    <Gtk.ScrolledWindow
                        vscrollbarPolicy={Gtk.PolicyType.NEVER}
                        hscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
                        minContentWidth={800}
                        maxContentWidth={1600}
                    >
                        <With value={workspaces}>
                            {(list) => (
                                <box spacing={20} css="padding-bottom: 10px;">
                                    {list
                                        .sort((a: any, b: any) => a.id - b.id)
                                        .filter((w: any) => w.id > 0)
                                        .map((w: any, idx: number) => (
                                            <WorkspaceCard ws={w} index={idx} />
                                        ))}
                                </box>
                            )}
                        </With>
                    </Gtk.ScrolledWindow>

                    <label
                        label="Use ← → o ↑ ↓ para navegar • Enter para seleccionar • Esc para cerrar"
                        css="font-size: 12px; opacity: 0.7;"
                    />
                </box>
            </box>
        </window>
    ) as Astal.Window;

    win.add_controller(keyController);

    return win;
}