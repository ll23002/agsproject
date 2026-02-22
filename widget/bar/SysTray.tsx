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
                // Create button using GTK directly instead of JSX
                const btn = new Gtk.Button();
                btn.set_tooltip_markup(item.tooltipMarkup);
                btn.set_css_classes(["flat", "systray-item"]);
                btn.set_has_frame(false);

                // Create and add icon
                const icon = new Gtk.Image();
                icon.set_from_gicon(item.gicon);
                icon.set_icon_size(Gtk.IconSize.NORMAL);
                btn.set_child(icon);

                // Handle click
                btn.connect("clicked", () => {
                    item.activate(0, 0);
                });

                // Update tooltip when it changes
                item.connect("notify::tooltip-markup", () => {
                    btn.set_tooltip_markup(item.tooltipMarkup);
                });

                // Update icon when it changes
                item.connect("notify::gicon", () => {
                    icon.set_from_gicon(item.gicon);
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
