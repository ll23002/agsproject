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
            GTypeName: "WorkspaceCarouselService",
            Properties: {
                'selectedIndex': GObject.ParamSpec.int(
                    'selectedIndex', 'SelectedIndex', 'Currently selected workspace index',
                    GObject.ParamFlags.READWRITE,
                    -1, 999, 0
                ),
                'revision': GObject.ParamSpec.int(
                    'revision', 'Revision', 'Trigger for re-render',
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
            this.notify("selectedIndex");
            this.notify("revision");
            //console.log(`[CarouselService] selectedIndex=${this.#selectedIndex}, revision=${this.#revision}`);
        }
    }

    get revision() {
        return this.#revision;
    }

    set revision(value: number) {
        this.#revision = value;
    }

    cycle(step: number, maxIndex: number) {
        const oldIndex = this.#selectedIndex;
        let next = this.#selectedIndex + step;
        if (next > maxIndex) next = 0;
        if (next < 0) next = maxIndex;
        //console.log(`[CarouselService] cycle(${step}, ${maxIndex}): ${oldIndex} -> ${next}`);
        this.selectedIndex = next;
    }

    resetToFocused(focusedId: number, sortedWorkspaces: any[]) {
        const index = sortedWorkspaces.findIndex((ws: any) => ws.id === focusedId);
        const finalIndex = index >= 0 ? index : 0;
        console.log(`[CarouselService] resetToFocused: focusedId=${focusedId}, found index=${index}, setting to=${finalIndex}`);
        console.log(`[CarouselService] sortedWorkspaces IDs: [${sortedWorkspaces.map((ws: any) => ws.id).join(', ')}]`);
        this.selectedIndex = finalIndex;
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
    //console.log(`[WorkspaceCarousel] Creando componente`);
    const hide = () => app.toggle_window("workspace-carousel");

    const keyController = new Gtk.EventControllerKey();

    keyController.connect("key-pressed", (_: Gtk.EventControllerKey, keyval: number) => {
       // console.log(`[KeyController] Tecla presionada: ${keyval}`);

        const sortedWorkspaces = hypr.get_workspaces()
            .filter((w: any) => w.id > 0)
            .sort((a: any, b: any) => a.id - b.id);

        const maxIndex = sortedWorkspaces.length - 1;
       // console.log(`[KeyController] Total workspaces: ${sortedWorkspaces.length}, maxIndex: ${maxIndex}`);

        if (keyval === Gdk.KEY_Escape) {
           // console.log(`[KeyController] Escape presionado - cerrando`);
            hide();
            return true;
        }
        if (keyval === Gdk.KEY_Left || keyval === Gdk.KEY_Up) {
           // console.log(`[KeyController] Flecha izquierda/arriba - antes selectedIndex=${carouselService.selectedIndex}`);
            carouselService.cycle(-1, maxIndex);
          //  console.log(`[KeyController] Flecha izquierda/arriba - después selectedIndex=${carouselService.selectedIndex}`);
            return true;
        }
        if (keyval === Gdk.KEY_Right || keyval === Gdk.KEY_Down) {
       //     console.log(`[KeyController] Flecha derecha/abajo - antes selectedIndex=${carouselService.selectedIndex}`);
            carouselService.cycle(1, maxIndex);
         //   console.log(`[KeyController] Flecha derecha/abajo - después selectedIndex=${carouselService.selectedIndex}`);
            return true;
        }
        if (keyval === Gdk.KEY_Return) {
            const selectedWs = sortedWorkspaces[carouselService.selectedIndex];
            const currentWs = hypr.get_focused_workspace();
            if (selectedWs) {
             //   console.log(`[KeyController] Enter presionado - selectedIndex: ${carouselService.selectedIndex}, workspace ID: ${selectedWs.id}, current: ${currentWs.id}`);
                // Solo hacer dispatch si no estamos ya en ese workspace
                if (selectedWs.id !== currentWs.id) {
                //    console.log(`[KeyController] Haciendo dispatch a workspace ${selectedWs.id}`);
                    hypr.dispatch("workspace", String(selectedWs.id));
                } else {
                    console.log(`[KeyController] Ya estamos en workspace ${selectedWs.id}, no se hace dispatch`);
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
                console.log(`[Window] onShow - inicializando carousel`);
                const sortedWorkspaces = hypr.get_workspaces()
                    .filter((w: any) => w.id > 0)
                    .sort((a: any, b: any) => a.id - b.id);
                const focusedWs = hypr.get_focused_workspace();
                console.log(`[Window] Workspace enfocado actual: ${focusedWs.id}`);
                carouselService.resetToFocused(focusedWs.id, sortedWorkspaces);
                console.log(`[Window] selectedIndex después de resetToFocused: ${carouselService.selectedIndex}`);
            }}
        >
            <box valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER} css="padding: 40px;">
                <box class="carousel-container" orientation={Gtk.Orientation.VERTICAL} spacing={24} halign={Gtk.Align.CENTER}>
                    <label
                        label="Resumen de Workspaces"
                        css="font-size: 32px; font-weight: bold; color: #0ABDC6;"
                        halign={Gtk.Align.CENTER}
                    />

                    <With value={revision}>
                        {(rev) => {
                            const sortedList = hypr.get_workspaces()
                                .filter((w: any) => w.id > 0)
                                .sort((a: any, b: any) => a.id - b.id);

                            const sel = carouselService.selectedIndex;
                            console.log(`[Render] revision=${rev}, ${sortedList.length} workspaces, selectedIndex=${sel}`);

                            return (
                                <box spacing={16} halign={Gtk.Align.CENTER}>
                                    {sortedList.map((w: any, idx: number) => {
                                        const isSelected = sel === idx;
                                        console.log(`[Button] WS ${w.id} (idx=${idx}): isSelected=${isSelected}`);
                                        return (
                                            <button
                                                class={isSelected ? "ws-preview-card selected" : "ws-preview-card"}
                                                focusable={false}
                                                onClicked={() => {
                                                    console.log(`[Click] WS ${w.id} (idx=${idx})`);
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
                                                        css="font-weight: bold; font-size: 16px;"
                                                    />
                                                </box>
                                            </button>
                                        );
                                    })}
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