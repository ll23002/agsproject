import {createBinding} from "ags";
import { Gtk } from "ags/gtk4";
import networkService from "../service/Network";

export default function NetworkStats() {
    return (
        <box class="network-stats" spacing={6}>
            <box spacing={2}>
                <Gtk.Image iconName="go-down-symbolic" class="network-icon down"/>
                <label
                    label={createBinding(networkService, "down")}
                    css="font-weight: bold; font-family: 'JetBrains Mono'; min-width: 52px;"
                    halign={Gtk.Align.END}
                    />
            </box>

            <box spacing={4}>
                <Gtk.Image iconName="go-up-symbolic" class="network-icon up"/>
                <label
                    label={createBinding(networkService, "up")}
                    css="font-weight: bold; font-family: 'JetBrains Mono'; min-width: 52px;"
                    halign={Gtk.Align.END}
                    />
            </box>
        </box>
    );
}