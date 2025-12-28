import { createBinding, createMemo } from "ags";
import GObject from "gi://GObject";
// @ts-ignore
import Hyprland from "gi://AstalHyprland";

// 1. Definimos nuestro GObject para el estado del mouse
class MouseState extends GObject.Object {
    static {
        GObject.registerClass({
            // Definimos la señal que emitiremos al cambiar
            Properties: {
                'hovered': GObject.ParamSpec.boolean(
                    'hovered', 'Hovered', 'Mouse hover state',
                    GObject.ParamFlags.READWRITE,
                    false
                ),
            },
        }, this);
    }

    // Propiedad privada
    #hovered = false;

    get hovered() {
        return this.#hovered;
    }

    set hovered(value: boolean) {
        if (this.#hovered !== value) {
            this.#hovered = value;
            this.notify("hovered"); // Notificamos a AGS/Astal
        }
    }
}

// 2. Instanciamos el servicio (Singleton)
export const mouseService = new MouseState();

// 3. Creamos los bindings
const hyprland = Hyprland.get_default();
const focusedClient = createBinding(hyprland, "focusedClient");

// Binding a nuestra propiedad 'hovered'
export const isHovered = createBinding(mouseService, "hovered");

// 4. Setter público para usar en los widgets
export const setHover = (value: boolean) => {
    mouseService.hovered = value;
};

// 5. La lógica combinada (Memo)
export const showWidget = createMemo(() => {
    const client = focusedClient();
    const hover = isHovered(); // createBinding devuelve un getter

    // Mostrar si (Escritorio vacío) O (Mouse encima)
    return !client || hover;
});