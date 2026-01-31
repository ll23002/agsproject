import GLib from "gi://GLib";
import { execAsync } from "ags/process";
import GObject from "gi://GObject";
// @ts-ignore
import Hyprland from "gi://AstalHyprland";

class WorkspacePreviewService extends GObject.Object {
    static {
        GObject.registerClass({
            Signals: {
                "preview-updated": { param_types: [GObject.TYPE_INT] }
            },
        }, this);
    }

    #hypr = Hyprland.get_default();
    #cacheDir = "/tmp/ags/workspaces";

    constructor() {
        super();
        GLib.mkdir_with_parents(this.#cacheDir, 0o755);
        //execAsync(`mkdir -p ${this.#cacheDir}`).catch(console.error);

        GLib.timeout_add(GLib.PRIORITY_LOW, 1000, () => {
            this.#snapshotCurrent().catch(e => console.error(e));
            return false;
        });


        const debouncedSnapshot = () => {
            GLib.timeout_add(GLib.PRIORITY_LOW, 800, () => {
                this.#snapshotCurrent().catch(e => console.error(e));
                return false;
            });
        };

        this.#hypr.connect("notify::focused-workspace", debouncedSnapshot);
        this.#hypr.connect("client-added", debouncedSnapshot);
        this.#hypr.connect("client-removed", debouncedSnapshot);
        this.#hypr.connect("client-moved", debouncedSnapshot);
    }

    async #snapshotCurrent() {
        try {
            const currentWs = this.#hypr.focusedWorkspace.id;
            if (currentWs <= 0) return;

            const path = `${this.#cacheDir}/ws_${currentWs}.png`;

            // Se puede reemplazar por algo más nativo? como GLib, GIO ?
            await execAsync(`grim -t png -l 0 "${path}"`);

            this.emit("preview-updated", currentWs);
        } catch (e) {
            console.error(`[PreviewService] Error capturando WS: ${e}`);
        }
    }

    getPreviewPath(id: number): string | null {
        const path = `${this.#cacheDir}/ws_${id}.png`;
        if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
            return path;
        }
        return null;
    }
}

const service = new WorkspacePreviewService();
export default service;