import { Astal, Gtk} from "ags/gtk4";
import powerService from "../service/PowerProfiles"

export default function PowerPanel() {
    const createBtn = (id: string, icon: string, label: string) => {
        return (
            <button
                class="profile-btn"
                onclicked={() => powerService.setProfile(id)}
                >
                <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                    <Gtk.Image iconName={icon}/>
                    <label label={label} css="font-size: 11px;"/>
                </box>
            </button>
        ) as Gtk.Button;
    };


    const btnSaver = createBtn("power-saver", "battery-level-10-symbolic", "Savings");
    const btnBalanced = createBtn("balanced", "battery-level-50-symbolic", "Balanced");
    const btnPerformance = createBtn("performance", "battery-level-100-symbolic", "Beast");


    const updateUI = () => {
        const current = powerService.profile;

        if (current === "power-saver") btnSaver.add_css_class("active");
        else btnSaver.remove_css_class("active");

        if (current === "balanced") btnBalanced.add_css_class("active");
        else btnBalanced.remove_css_class("active");

        if (current === "performance") btnPerformance.add_css_class("active");
        else btnPerformance.remove_css_class("active");
    };

    powerService.connect("changed", updateUI);
    updateUI();

    return (
        <box class="power-panel" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
            <label
                label="Modo de Energía"
                halign={Gtk.Align.START}
                css="font-weight: bold; margin-left: 5px;"
                />

            <box spacing={10} homogeneous>
                {btnSaver}
                {btnBalanced}
                {btnPerformance}
            </box>

        </box>
    )
}