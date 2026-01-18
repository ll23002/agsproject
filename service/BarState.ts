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
                'popover_open': GObject.ParamSpec.boolean(
                    'popover_open', 'PopoverOpen', 'Popover open state',
                    GObject.ParamFlags.READWRITE,
                    false
                ),
            },
        }, this);
    }

    #hovered = false;
    #popoverOpen = false;

    get hovered() {
        return this.#hovered;
    }

    set hovered(value: boolean) {
        if (this.#hovered !== value) {
            this.#hovered = value;
            this.notify("hovered");
        }
    }

    get popover_open() {
        return this.#popoverOpen;
    }
    set popover_open(value: boolean) {
        if (this.#popoverOpen !== value){
            this.#popoverOpen = value;
            this.notify("popover_open");
        }
    }
}

export const mouseService = new MouseState();
const hyprland = Hyprland.get_default();
const focusedClient = createBinding(hyprland, "focusedClient");
export const isHovered = createBinding(mouseService, "hovered");
export const isPopoverOpen = createBinding(mouseService, "popover_open");

export const setHover = (value: boolean) => {
    mouseService.hovered = value;
};

export const setPopoverOpen = (value: boolean) => {
    mouseService.popover_open = value;
};

export const showWidget = createMemo(() => {
    const client = focusedClient();
    const hover = isHovered();
    const popover = isPopoverOpen();

    return !client || hover || popover;
});