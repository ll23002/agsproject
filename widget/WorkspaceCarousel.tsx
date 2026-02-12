import { Astal, Gtk, Gdk } from "ags/gtk4";
import { createBinding, With } from "ags";
import GObject from "gi://GObject";
import Gio from "gi://Gio"
import app from "ags/gtk4/app";
import PreviewService from "../service/WorkspaceReview";
//@ts-ignore
import Hyprland from "gi://AstalHyprland";


class WorkspaceCarouselService extends GObject.Object {
    static {
        GObject.registerClass({
            GTypeName: "WorkspaceCarouselService",
            Properties: {
                'selectedIndex': GObject.ParamSpec.int(
                    'selectedIndex', 'SelectedIndex', 'Workspace seleccionado actualmente',
                    GObject.ParamFlags.READWRITE,
                    -1, 999, 0
                ),
                'revision': GObject.ParamSpec.int(
                    'revision', 'Revision', 'Revision para forzar actualizaciones',
                    GObject.ParamFlags.READWRITE,
                    0, 999999, 0
                ),
            },
        }, this);
    }

    #selectedIndex: number = 0;
    #revision: number = 0;

    get selectedIndex() {
        return this.#selectedIndex;
    }

    set selectedIndex(value: number) {
        if (this.#selectedIndex !== value) {
            this.#selectedIndex = value;
            this.#revision++;
            this.notify('selectedIndex');
            this.notify('revision');
        }
    }

    get revision() {
        return this.#revision;
    }

    set revision(value: number) {
        this.#revision = value;
    }

    cycle(step: number, maxIndex: number) {
        let next = this.#selectedIndex + step;
        if (next > maxIndex) next = 0;
        if (next < 0) next = maxIndex;
        this.selectedIndex = next;
    }

    resetToFocused(focusedId: number, sortedWorkspaces: any[]){
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
                    "path", "Path", "Ruta de la imagen",
                    GObject.ParamFlags.READWRITE,
                    null
                ),
            },
        }, this);
    }

    #path: string | null = null;
    readonly #id: number;
    _signalId: number = 0;

    get path(){
        return this.#path;
    }

    set path(value: string | null) {
        if (this.#path !== value) {
            this.#path = value;
            this.notify('path');
        }
    }

    constructor(id: number) {
        super();
        this.#id = id;

        this.updatePath();

        this._signalId = PreviewService.connect("preview-updated", (_: any, updatedId: number) => {
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
            { (path) => (
                <Gtk.Picture
                    contentFit={Gtk.ContentFit.COVER}
                    widthRequest={280}
                    heightRequest={150}
                    file={path ? Gio.File.new_for_path(path) : null}
                    />
            )}
        </With>
    );
}


export default function WorkspaceCarousel(gdkmonitor: Gdk.Monitor) {
    const hypr = Hyprland.get_default();
    const revision = createBinding(carouselService, "revision");
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
            const currentWs = hypr.get_focused_workspace();

            if (selectedWs) {
                if (currentWs.id !== selectedWs.id) {
                    hypr.dispatch("workspace", String(selectedWs.id));
                }
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
                const focusedWs = hypr.get_focused_workspace();
                carouselService.resetToFocused(focusedWs.id, sortedWorkspaces);
            }}
        >
            <box valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER} css={"padding: 40px;"}>
                <box class="carousel-container" orientation={Gtk.Orientation.VERTICAL} spacing={24} halign={Gtk.Align.CENTER}>
                    <With value={revision}>
                        {(_rev) => {
                            const sortedList = hypr.get_workspaces()
                                .filter((w: any) => w.id > 0)
                                .sort((a: any, b: any) => a.id - b.id);

                            const sel = carouselService.selectedIndex;
                            const totalWorkspaces = sortedList.length;

                            let visibleIndices: number[];

                            if (totalWorkspaces <= 3) {
                                visibleIndices = sortedList.map((_: any, idx: number) => idx);
                            } else {
                                const prevIdx = sel -1 < 0 ? totalWorkspaces - 1 : sel -1;
                                const nextIdx = sel +1 >= totalWorkspaces ? 0 : sel +1;
                                visibleIndices = [prevIdx, sel, nextIdx];
                            }


                            const needsGhosts = totalWorkspaces < 3;
                            const ghostType = totalWorkspaces === 1 ? "full" : "reduced";

                            return (
                                <box spacing={16} halign={Gtk.Align.CENTER}>

                                    {needsGhosts && (
                                        <box
                                            class={`ws-ghost ${ghostType}`}
                                        >
                                            <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                                                <box css="min-width: 280px; min-height: 150px;" />
                                                <label label="Ghost" css="font-size: 14px;" />
                                            </box>
                                        </box>
                                    )}

                                    {visibleIndices.map((idx: number) => {
                                        const w = sortedList[idx];
                                        const isSelected = idx === sel;

                                        return (
                                            <button
                                                class={isSelected ? "ws-preview-card selected" : "ws-preview-card"}
                                                focusable={false}
                                                onClicked={() => {
                                                    carouselService.selectedIndex = idx;
                                                    const currentWs = hypr.get_focused_workspace();
                                                    if (w.id !== currentWs.id) {
                                                        hypr.dispatch("workspace", String(w.id));
                                                    }
                                                    hide();
                                                }}
                                            >
                                                <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                                                    <box class="image-container">
                                                        <PreviewImage id={w.id} />
                                                    </box>
                                                    <label
                                                        label={`Workspace ${w.id}`}
                                                        css="font-weight: bold; font-size: 14px;"
                                                        />
                                                </box>

                                            </button>
                                        );
                                    })}


                                    {needsGhosts && (
                                        <box
                                            class={`ws-ghost ${ghostType}`}
                                        >
                                            <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                                                <box css="min-width: 280px; min-height: 150px;" />
                                                <label label="Ghost" css="font-size: 14px;" />
                                            </box>
                                        </box>
                                    )}

                                </box>
                            );
                        }}
                    </With>
                </box>
            </box>

        </window>
    ) as Astal.Window;

    win.add_controller(keyController);

    return win;
}