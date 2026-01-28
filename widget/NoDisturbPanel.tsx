import { createBinding } from "ags";
// @ts-ignore
import Notifd from "gi://AstalNotifd";

export default function NoDisturbPanel() {
    const notifd = Notifd.get_default();
    const dndBinding = createBinding(notifd, "dontDisturb");

    return (
        <button
            widthRequest={145}
            heightRequest={60}
            class={dndBinding(d => d ? "dnd-button active" : "dnd-button")}
            onClicked={() => notifd.set_dont_disturb(!notifd.dontDisturb)}
        >
            <box spacing={8}>
                <label label={dndBinding(d => d ? "\u{f05f9}" : "\u{f0f3}")} />
                <label label="No Molestar" />
            </box>
        </button>
    );
}

