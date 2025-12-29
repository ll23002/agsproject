import { createBinding, createMemo } from "ags";
import GObject from "gi://GObject";
// @ts-ignore
import Hyprland from "gi://AstalHyprland";

class MouseState extends GObject.Object {
    static {
        GObject.registerClass({
            Properties: {
                'hovered': GObject.ParamSpec.boolean(
                    'hovered', 'Hovered', 'Mouse hover state',
                    GObject.ParamFlags.READWRITE,
                    false
                ),
            },
        }, this);
    }

    #hovered = false;

    get hovered() {
        return this.#hovered;
    }

    set hovered(value: boolean) {
        if (this.#hovered !== value) {
            this.#hovered = value;
            this.notify("hovered");
        }
    }
}

export const mouseService = new MouseState();
const hyprland = Hyprland.get_default();
const focusedClient = createBinding(hyprland, "focusedClient");
export const isHovered = createBinding(mouseService, "hovered");

export const setHover = (value: boolean) => {
    mouseService.hovered = value;
};

export const showWidget = createMemo(() => {
    const client = focusedClient();
    const hover = isHovered();

    return !client || hover;
});