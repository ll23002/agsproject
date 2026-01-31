import { Astal, Gtk, Gdk } from "ags/gtk4";
import { createBinding, With } from "ags";
import GObject from "gi://GObject";
import Gio from "gi://Gio";
import app from "ags/gtk4/app";
import PreviewService from "../service/WorkspaceReview";
// @ts-ignore
import Hyprland from "gi://AstalHyprland";


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




function WorkspaceCard({ ws, index, onSelect }: { ws: any; index: number; onSelect: (wsId: number) => void }) {
    const selectedIndex = createBinding(carouselService, "selectedIndex");

    return (
        <button
            class={selectedIndex(idx => {
                const isSelected = idx === index;
                if (isSelected) return "ws-preview-card selected";
                return "ws-preview-card";
            })}
            focusable={false}
            onClicked={() => {
                carouselService.selectedIndex = index;
                onSelect(ws.id);
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
            css="background-color: rgba(0, 0, 0, 0.85);"
            onShow={() => {
                const sortedWorkspaces = hypr.get_workspaces()
                    .filter((w: any) => w.id > 0)
                    .sort((a: any, b: any) => a.id - b.id);
                carouselService.resetToFocused(hypr.get_focused_workspace().id, sortedWorkspaces);
            }}
        >
            <box valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER} css="padding: 40px;">
                <box class="carousel-container" orientation={Gtk.Orientation.VERTICAL} spacing={24} halign={Gtk.Align.CENTER}>
                    <label
                        label="Resumen de Workspaces"
                        css="font-size: 32px; font-weight: bold; color: #0ABDC6;"
                        halign={Gtk.Align.CENTER}
                    />

                    <With value={workspaces}>
                        {(list) => {
                            const sortedList = list
                                .filter((w: any) => w.id > 0)
                                .sort((a: any, b: any) => a.id - b.id);

                            return (
                                <box
                                    spacing={16}
                                    halign={Gtk.Align.CENTER}
                                >
                                    {sortedList.map((w: any, idx: number) => (
                                        <WorkspaceCard
                                            ws={w}
                                            index={idx}
                                            onSelect={(wsId) => {
                                                hypr.dispatch("workspace", String(wsId));
                                                hide();
                                            }}
                                        />
                                    ))}
                                </box>
                            );
                        }}
                    </With>

                    <label
                        label="Use ← → o ↑ ↓ para navegar • Enter para seleccionar • Esc para cerrar"
                        css="font-size: 14px; opacity: 0.9; color: #cdd6f4; margin-top: 10px;"
                        halign={Gtk.Align.CENTER}
                    />
                </box>
            </box>
        </window>
    ) as Astal.Window;

    win.add_controller(keyController);

    return win;
}