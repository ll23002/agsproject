import { createBinding } from "ags";
import GObject from "gi://GObject";

class BarVisibilityState extends GObject.Object {
    static {
        GObject.registerClass({
            Properties: {
                'visible': GObject.ParamSpec.boolean(
                    'visible', 'Visible', 'Bar visibility state',
                    GObject.ParamFlags.READWRITE,
                    true,
                ),
            },
        }, this);
    }

    #visible = true;

    get visible() {
        return this.#visible;
    }

    set visible(value: boolean) {
        if (this.#visible !== value) {
            this.#visible = value;
            this.notify('visible');

        }
    }

    toggle() {
        this.#visible = !this.#visible;
    }

}

const service = new BarVisibilityState();

export const showWidget = createBinding(service, "visible");

//@ts-ignore
globalThis.toggleBar = () => service.toggle();

export const setPopoverOpen = (value: boolean) => {
    if (value) service.visible = value;
}