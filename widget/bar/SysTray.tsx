import { Gtk } from "ags/gtk4";
// @ts-ignore
import AstalTray from "gi://AstalTray";

export function SysTray() {
    try {
        const tray = AstalTray.get_default();

        const box = <box class="systray" spacing={8} /> as Gtk.Box;

        const handleItemsChanged = () => {
            // Clear current children
            let child = box.get_first_child();
            while (child) {
                const next = child.get_next_sibling();
                box.remove(child);
                child = next;
            }

            // Add new children
            const items = tray.get_items();
            items.forEach((item: any) => {
                const btn = new Gtk.MenuButton();
                btn.set_tooltip_markup(item.tooltipMarkup);
                btn.set_css_classes(["flat", "systray-item"]);
                btn.set_has_frame(false);

                // Insert action group and menu model
                btn.insert_action_group("dbusmenu", item.action_group);
                if (item.menu_model) {
                    btn.set_menu_model(item.menu_model);
                }

                // Open menu on right-click instead of default left-click
                btn.set_primary(false);

                // Create and add icon
                const icon = new Gtk.Image();
                icon.set_from_gicon(item.gicon);
                icon.set_icon_size(Gtk.IconSize.NORMAL);
                btn.set_child(icon);

                // Handle left clicks to activate item
                const click = new Gtk.GestureClick();
                click.set_button(1); // Left-click only
                click.connect("pressed", (gesture: any, n_press: number, x: number, y: number) => {
                    item.activate(x, y);
                });
                btn.add_controller(click);

                // Tell the app the menu is about to show on right-click
                const rightClick = new Gtk.GestureClick();
                rightClick.set_button(3); // Right-click only
                rightClick.connect("pressed", () => {
                    item.about_to_show();
                });
                btn.add_controller(rightClick);

                // Update tooltip when it changes
                item.connect("notify::tooltip-markup", () => {
                    btn.set_tooltip_markup(item.tooltipMarkup);
                });

                // Update icon when it changes
                item.connect("notify::gicon", () => {
                    icon.set_from_gicon(item.gicon);
                });
                
                // Update menu model when it changes
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
