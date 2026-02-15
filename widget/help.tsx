import { Astal, Gtk, Gdk } from "ags/gtk4";
import App from "ags/gtk4/app";
import { createBinding, With } from "ags";
import { execAsync } from "ags/process";
import GObject from "gi://GObject"

interface Command {
    categoria: string;
    cmd: string;
    descripcion: string;
}

const COMMANDS: Command[] = [
    { categoria: "Texto", cmd: "cat archivo.txt", descripcion: "Ver el contenido de un archivo" },
    { categoria: "Texto", cmd: "echo 'Hola mundo'", descripcion: "Imprimir texto en stdout" },
    { categoria: "Texto", cmd: "less archivo.txt", descripcion: "Ver el contenido de un archivo paginado" },// no tengo instalado less
    { categoria: "Texto", cmd: "head -n 10 archivo", descripcion: "Ver las primeras 10 lineas"},
    { categoria: "Texto", cmd: "tail -n 10 archivo", descripcion: "Ver las ultimas 10 lineas"},
    { categoria: "Texto", cmd: "tail -f archivo", descripcion: "Ver el contenido de un archivo en tiempo real"},
    { categoria: "Texto", cmd: "touch archivo", descripcion: "Crear un archivo vacio"},
    { categoria: "Texto", cmd: "wc -l archivo", descripcion: "Contar lineas de un archivo"},
    { categoria: "Texto", cmd: "sort archivo", descripcion: "Ordenar lineas alfabeticamente"},
    { categoria: "Texto", cmd: "uniq archivo", descripcion: "Eliminar lineas duplicadas adyacentes"},
    { categoria: "Texto", cmd: "grep patron archivo", descripcion: "Buscar patron en archivo"},
    { categoria: "Texto", cmd: "diff archivo1 archivo2", descripcion: "Comparar archivos"},

    { categoria: "Power Text", cmd: "grep -r 'texto' .", descripcion: "Buscar texto recursivamente"},
    { categoria: "Power Text", cmd: "grep -v 'patron' archivo", descripcion: "Buscar texto excluyendo patrones"},
    { categoria: "Power Text", cmd: "sed 's/patron/reemplazo/g' archivo", descripcion: "Reemplazar patrones"},

];

class CheatState extends GObject.Object {
    static {
        GObject.registerClass({
            Properties: {
               'query': GObject.ParamSpec.string(
                   'query', 'Query', 'Search query',
                   GObject.ParamFlags.READWRITE,
                   ""
               ),
            },
        }, this);
    }

    #query: string = "";

    get query() {return this.#query;}

    set query(val: string) {
        if(this.#query !== val) {
            this.#query = val;
            this.notify("query");
        }
    }
}


const state = new CheatState();

export default function CheatSheet(gdkmonitor: Gdk.Monitor) {
    const queryBinding = createBinding(state, "query");
    const hide = () => App.toggle_window("cheatsheet");

    const copyToClipboard = (cmd: string) => {
        execAsync(["bash", "-c", `echo -n "${cmd}" | wl-copy`])
            .then(() => {
                console.log(`Copiado al portapapeles: ${cmd}`);
                hide();
            }).catch(console.error);
    };

    const keyController = new Gtk.EventControllerKey();
    //@ts-ignore
    keyController.connect("key-pressed", (_, keyval) => {
        if (keyval === Gdk.KEY_Escape) {
            hide();
            state.query = "";
            return true;
        }
        return false;
    });


    return (
        <window
            name="cheatsheet"
            visible={false}
            gdkmonitor={gdkmonitor}
            anchor={Astal.WindowAnchor.CENTER}
            exclusivity={Astal.Exclusivity.IGNORE}
            keymode={Astal.Keymode.EXCLUSIVE}
            layer={Astal.Layer.OVERLAY}
            application={App}
            css="background-color: transparent;"
        >

            <box class="cheatsheet-window" orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <box class="search-box" spacing={10}>
                    <label label={"\u{f002}"} css="font-size: 18px; color: #0ABDC6;"/>
                    <Gtk.Entry
                        placeholderText="Buscar comando..."
                        hexpand
                        text={queryBinding(q => q)}
                        //@ts-ignore
                        onChanged={({ text }) => state.query = text || ""}
                        onActivate={() => {
                            const q = state.query.toLowerCase();
                            const filtered = COMMANDS.filter(c =>
                                c.cmd.toLowerCase().includes(q) ||
                                c.descripcion.toLowerCase().includes(q) ||
                                c.categoria.toLowerCase().includes(q)
                            );
                            if (filtered.length === 1) {
                                copyToClipboard(filtered[0].cmd);
                            }
                        }}
                        />
                    <button class="close-btn" onClicked={hide}>
                        <label label={"\u{f00d}"}/>
                    </button>
                </box>

                <Gtk.Separator />

                <Gtk.ScrolledWindow
                    vexpand
                    minContentHeight={500}
                    minContentWidth={700}
                    propagateNaturalHeight
                    css="padding: 10px;"
                >
                    <With value={queryBinding}>
                        {(q) => {
                            const search = q.toLowerCase();
                            const filtered = COMMANDS.filter(c =>
                            c.cmd.toLowerCase().includes(search) ||
                            c.descripcion.toLowerCase().includes(search) ||
                            c.categoria.toLowerCase().includes(search)
                            );
                            return (
                                <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
                                    {filtered.length === 0 ? (
                                        <box orientation={Gtk.Orientation.VERTICAL} valing={Gtk.Align.CENTER} spacing={10} vexpand>
                                            <label label={"\u{f059}"} css="font-size: 48px; opacity: 0.5;" />
                                            <label label="No sé que estas buscando..." css="opacity: 0.7;" />
                                        </box>
                                        ) : (
                                            filtered.map((item, i) => (
                                                <button
                                                    class="cheat-item"
                                                    onClicked={() => copyToClipboard(item.cmd)}
                                                >
                                                    <box spacing={15}>
                                                        <label
                                                            class="cat-badge"
                                                            label={item.categoria}
                                                            widthRequest={90}
                                                            xalign={0.5}
                                                            ellipsize={3}
                                                            />

                                                        <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                                                            <label
                                                                class="cmd-text"
                                                                label={item.cmd}
                                                                halign={Gtk.Align.START}
                                                                selectable
                                                                ellipsize={3}
                                                                />
                                                            <label
                                                                class="desc-text"
                                                                label={item.descripcion}
                                                                halign={Gtk.Align.START}
                                                                ellipsize={3}
                                                                />
                                                        </box>

                                                        <label
                                                            label={"\u{f0c5}"}
                                                            class="copy-icon"
                                                            halign={Gtk.Align.END}
                                                            />
                                                    </box>
                                                </button>
                                            ))
                                    )}
                                </box>
                            );
                        }}
                    </With>
                </Gtk.ScrolledWindow>
            </box>

            <dumy onRealize={(self) => {
                const win = self.get_toplevel() as Gtk.Window;
                if(win) win.add_controller(keyController);
            }}/>

        </window>
    ) as Astal.Window;
}
