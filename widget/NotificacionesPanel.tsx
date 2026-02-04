import { createBinding, With } from "ags"
import { Gtk } from "ags/gtk4"
import GLib from "gi://GLib"
import GObject from "gi://GObject"
// @ts-ignore
import Notifd from "gi://AstalNotifd"

class NotificationExpandState extends GObject.Object {
    static {
        GObject.registerClass({
            GTypeName: "NotificationExpandState",
            Properties: {
                'expanded': GObject.ParamSpec.boolean(
                    'expanded', 'Expanded', 'Estado de expansión',
                    GObject.ParamFlags.READWRITE,
                    false
                ),
            },
        }, this);
    }

    #expanded = false;

    get expanded() {
        return this.#expanded;
    }

    set expanded(value: boolean) {
        if (this.#expanded !== value) {
            this.#expanded = value;
            this.notify('expanded');
        }
    }

    toggle() {
        this.expanded = !this.expanded;
    }
}

const expandStates = new Map<number, NotificationExpandState>();

function getExpandState(notifId: number): NotificationExpandState {
    if (!expandStates.has(notifId)) {
        const newState = new NotificationExpandState();
        expandStates.set(notifId, newState);

    }
    return expandStates.get(notifId)!;
}

function NotificationIcon({ n }: { n: Notifd.Notification }) {
    if (n.image && GLib.file_test(n.image, GLib.FileTest.EXISTS)) {
        return (
            <Gtk.Image
                file={n.image}
                pixelSize={48}
                valign={Gtk.Align.START}
            />
        )
    }

    if (n.appIcon) {
        return (
            <Gtk.Image
                iconName={n.appIcon}
                pixelSize={48}
                valign={Gtk.Align.START}
                class="notif-icon"
            />
        )
    }

    return (
        <label
            label={"\u{ea74}"}
            css="font-size: 32px; color: #89b4fa;"
            valign={Gtk.Align.START}
            class="notif-icon"
        />
    )
}

function NotificationCard({ n }: { n: Notifd.Notification }) {

    const summaryLength = n.summary.length
    const bodyLength = n.body ? n.body.length : 0
    const shouldShowExpandButton = summaryLength > 20 || bodyLength > 30


    const expandState = getExpandState(n.id)

    const expandedBinding = createBinding(expandState, "expanded")

    return (
        <box
            class="notification-card"
            spacing={12}
            css="background-color: rgba(30, 30, 46, 0.5); padding: 12px; border-radius: 12px;"
        >
            <NotificationIcon n={n} />

            <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                <box spacing={5}>
                    <label
                        label={expandedBinding(expanded => {
                            return (expanded
                                ? n.summary
                                : (summaryLength > 20 ? n.summary.substring(0, 20) + "..." : n.summary));
                        })}
                        halign={Gtk.Align.START}
                        hexpand
                        wrap={expandedBinding(expanded => {
                            return expanded;
                        })}
                        css="font-weight: bold; font-size: 14px;"
                    />

                    {shouldShowExpandButton && (
                        <button
                            onClicked={() => {
                                expandState.toggle();
                            }}
                            css="padding: 0; background: transparent; border: none; box-shadow: none;"
                        >
                            <label
                                label={expandedBinding(expanded => {
                                    return expanded ? "\u{f005d}" : "\u{f0045}";
                                })}
                                css="font-size: 16px; color: #89b4fa;"
                                tooltipText={expandedBinding(expanded => expanded ? "Contraer" : "Expandir")}
                            />
                        </button>
                    )}

                    <button
                        onClicked={() => n.dismiss()}
                        css="padding: 0; background: transparent; border: none; box-shadow: none;"
                    >
                        <label label={"\u{f467}"} css="font-size: 16px; color: #f38ba8;" />
                    </button>
                </box>

                {n.body && (
                    <label
                        label={expandedBinding(expanded => {
                            if (expanded) {
                                return n.body;
                            }
                            if (bodyLength > 30) {
                                return  n.body.substring(0, 30) + "...";
                            }
                            return n.body;
                        })}
                        halign={Gtk.Align.START}
                        wrap={true}
                        useMarkup={true}
                        css="color: #cdd6f4; font-size: 13px;"
                    />
                )}

                <label
                    label={n.appName || "Sistema"}
                    halign={Gtk.Align.START}
                    css="font-size: 10px; color: #7f849c; margin-top: 4px;"
                />
            </box>
        </box>
    )
}

export default function NotificacionesPanel() {
    const notifd = Notifd.get_default()
    const notifications = createBinding(notifd, "notifications")

    return (
        <box orientation={Gtk.Orientation.VERTICAL} spacing={10} class="notification-center">
            <box class="notification-header" spacing={10}>
                <label
                    label={notifications(n => `Notificaciones (${n.length})`)}
                    hexpand
                    halign={Gtk.Align.START}
                    css="font-weight: bold; font-size: 16px;"
                />
                <button
                    class="clear-button"
                    onClicked={() => {
                        // @ts-ignore
                        notifd.get_notifications().forEach(n => n.dismiss())
                    }}
                    tooltipText="Limpiar todo"
                >

                    <label label={"\u{f039f}"} css="font-size: 14px;" />
                </button>
            </box>

            <Gtk.ScrolledWindow
                vexpand
                hscrollbarPolicy={Gtk.PolicyType.NEVER}
                css="min-height: 300px;"
            >
                <With value={notifications}>
                    {(notifs) => notifs.length === 0 ? (
                        <box
                            orientation={Gtk.Orientation.VERTICAL}
                            valign={Gtk.Align.CENTER}
                            halign={Gtk.Align.CENTER}
                            spacing={10}
                            css="margin-top: 50px;"
                        >
                            <label label={"\u{f1f6}"} css="font-size: 48px; color: #585b70;" />
                            <label label="Sin notificaciones" css="color: #a6adc8;" />
                        </box>
                    ) : (
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={10} css="padding: 10px;">
                            {notifs.map((n: Notifd.Notification) => (
                                <NotificationCard n={n} />
                            ))}
                        </box>
                    )}
                </With>
            </Gtk.ScrolledWindow>
        </box>
    );
}