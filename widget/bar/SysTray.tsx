import { Gtk } from "ags/gtk4";
// @ts-ignore
import AstalTray from "gi://AstalTray";

export function SysTray() {
    try {
        const tray = AstalTray.get_default();

        const box = <box class="systray" spacing={8} /> as Gtk.Box;

        const handleItemsChanged = () => {
            let child = box.get_first_child();
            while (child) {
                const next = child.get_next_sibling();
                box.remove(child);
                child = next;
            }


            const items = tray.get_items();
            items.forEach((item: any) => {
                const btn = new Gtk.MenuButton();
                btn.set_tooltip_markup(item.tooltipMarkup);
                btn.set_css_classes(["flat", "systray-item"]);
                btn.set_has_frame(false);


                btn.insert_action_group("dbusmenu", item.action_group);
                if (item.menu_model) {
                    btn.set_menu_model(item.menu_model);
                }

                btn.set_primary(false);

                const icon = new Gtk.Image();
                icon.set_from_gicon(item.gicon);
                icon.set_icon_size(Gtk.IconSize.NORMAL);
                btn.set_child(icon);

                const click = new Gtk.GestureClick();
                click.set_button(1);
                click.connect("pressed", (gesture: any, n_press: number, x: number, y: number) => {
                    item.activate(x, y);
                });
                btn.add_controller(click);


                const rightClick = new Gtk.GestureClick();
                rightClick.set_button(3);
                rightClick.connect("pressed", () => {
                    item.about_to_show();
                });
                btn.add_controller(rightClick);

                item.connect("notify::tooltip-markup", () => {
                    btn.set_tooltip_markup(item.tooltipMarkup);
                });

                item.connect("notify::gicon", () => {
                    icon.set_from_gicon(item.gicon);
                });

                item.connect("notify::menu-model", () => {
                    btn.set_menu_model(item.menu_model);
                });

                box.append(btn);
            });
        };

        tray.connect("notify::items", handleItemsChanged);
        handleItemsChanged();

        return box;
    } catch (e) {
        console.error("SysTray error:", e);
        return <box />;
    }
}
