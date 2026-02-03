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

        // Conectar al evento notify para ver cuando cambia
        newState.connect('notify::expanded', () => {
            console.log(`[ExpandState ${notifId}] Estado cambió a: ${newState.expanded}`);
        });
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
    console.log(`[NotificationCard] Renderizando notificación ${n.id}`);
    console.log(`[NotificationCard ${n.id}] Summary: "${n.summary}"`);
    console.log(`[NotificationCard ${n.id}] Summary length: ${n.summary.length}`);
    console.log(`[NotificationCard ${n.id}] Body: "${n.body || 'N/A'}"`);
    console.log(`[NotificationCard ${n.id}] Body length: ${n.body ? n.body.length : 0}`);

    const summaryLength = n.summary.length
    const bodyLength = n.body ? n.body.length : 0

    // Mostrar botón si el summary O el body son largos
    const shouldShowExpandButton = summaryLength > 25 || bodyLength > 100

    console.log(`[NotificationCard ${n.id}] shouldShowExpandButton: ${shouldShowExpandButton} (summary: ${summaryLength}, body: ${bodyLength})`);

    const expandState = getExpandState(n.id)
    console.log(`[NotificationCard ${n.id}] Estado actual: ${expandState.expanded}`);

    const expandedBinding = createBinding(expandState, "expanded")
    console.log(`[NotificationCard ${n.id}] Binding creado`);

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
                            const result = expanded
                                ? n.summary
                                : (summaryLength > 25 ? n.summary.substring(0, 25) + "..." : n.summary);
                            console.log(`[NotificationCard ${n.id}] label binding ejecutado: expanded=${expanded}, showing="${result}"`);
                            return result;
                        })}
                        halign={Gtk.Align.START}
                        hexpand
                        wrap={expandedBinding(expanded => {
                            console.log(`[NotificationCard ${n.id}] wrap binding: expanded=${expanded}`);
                            return expanded;
                        })}
                        css="font-weight: bold; font-size: 14px;"
                    />

                    {shouldShowExpandButton && (
                        <button
                            onClicked={() => {
                                console.log(`[NotificationCard ${n.id}] Botón clickeado! Estado actual: ${expandState.expanded}`);
                                expandState.toggle();
                                console.log(`[NotificationCard ${n.id}] Después de toggle: ${expandState.expanded}`);
                            }}
                            css="padding: 0; background: transparent; border: none; box-shadow: none;"
                        >
                            <label
                                label={expandedBinding(expanded => {
                                    const icon = expanded ? "\u{f143}" : "\u{f140}";
                                    console.log(`[NotificationCard ${n.id}] Icono del botón: expanded=${expanded}, icon=${icon}`);
                                    return icon;
                                })}
                                css="font-size: 12px; color: #89b4fa;"
                                tooltipText={expandedBinding(expanded => expanded ? "Contraer" : "Expandir")}
                            />
                        </button>
                    )}

                    <button
                        onClicked={() => n.dismiss()}
                        css="padding: 0; background: transparent; border: none; box-shadow: none;"
                    >
                        <label label={"\u{f467}"} css="font-size: 12px; color: #f38ba8;" />
                    </button>
                </box>

                {n.body && (
                    <label
                        label={expandedBinding(expanded => {
                            if (expanded) {
                                console.log(`[NotificationCard ${n.id}] body expandido, mostrando todo`);
                                return n.body;
                            }
                            // Truncar el body si es muy largo
                            if (bodyLength > 150) {
                                const truncated = n.body.substring(0, 150) + "...";
                                console.log(`[NotificationCard ${n.id}] body truncado a 150 chars`);
                                return truncated;
                            }
                            console.log(`[NotificationCard ${n.id}] body completo (< 150 chars)`);
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