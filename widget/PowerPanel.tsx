import { Gtk } from "ags/gtk4"
import { createBinding } from "ags"
import powerService from "../service/PowerProfiles"

export default function PowerPanel() {
    const currentProfile = createBinding(powerService, "profile")

    const createBtn = (id: string, icon: string, label: string) => {
        return (
            <button

                class={currentProfile(p =>
                    p === id ? "profile-btn active" : "profile-btn"
                )}
                onClicked={() => powerService.setProfile(id)}
            >
                <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                    <label label={icon} css="font-size: 16px;"/>
                    <label label={label} css="font-size: 11px;"/>
                </box>
            </button>
        )
    }

    return (
        <box class="power-panel" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
            <label
                label="Modo de Energía"
                halign={Gtk.Align.START}
                css="font-weight: bold; margin-left: 5px;"
            />

            <box spacing={10} homogeneous>
                {createBtn("power-saver", "\u{f06c}", "Savings")}
                {createBtn("balanced", "\u{f05d1}", "Balanced")}
                {createBtn("performance", "\u{f427}", "Beast")}
            </box>
        </box>
    )
}