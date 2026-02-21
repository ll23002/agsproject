import { createBinding } from "ags";
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
                const tooltipBinding = createBinding(item, "tooltipMarkup");
                const actionBinding = createBinding(item, "actionGroup");
                const menuModelBinding = createBinding(item, "menuModel");
                const iconBinding = createBinding(item, "gicon");

                const btn = (
                    <menubutton
                        tooltipMarkup={tooltipBinding(t => t)}
                        usePopover={false}
                        actionGroup={actionBinding(a => a)}
                        menuModel={menuModelBinding(m => m)}
                        css="background: transparent; border: none; box-shadow: none; padding: 4px;"
                    >
                        <Gtk.Image gicon={iconBinding(g => g)} />
                    </menubutton>
                ) as Gtk.MenuButton;

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
