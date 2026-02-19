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
    { categoria: "Power Text", cmd: "sed -i 's/patron/reemplazo/g' archivo", descripcion: "Reemplazar patrones y sobreescribir archivo"},
    { categoria: "Power Text", cmd: "awk '{print $1}' archivo", descripcion: "Imprimir la primera columna de un archivo"},
    { categoria: "Power Text", cmd: "awk -F',' '{print $2}' csv", descripcion: "Imprimir la segunda columna de un archivo CSV"},
    { categoria: "Power Text", cmd: "xargs", descripcion: "Convertir stdin en argumentos para un comando"},

    { categoria: "Archivos", cmd: "ls -lah", descripcion: "Listar archivos y directorios"},
    { categoria: "Archivos", cmd: "cd -", descripcion: "Volver al directorio anterior"},
    { categoria: "Archivos", cmd: "pwd", descripcion: "Mostrar el directorio actual"},
    { categoria: "Archivos", cmd: "cp -r origen destino", descripcion: "Copiar directorios recursivamente"},
    { categoria: "Archivos", cmd: "rsync -avhP origen destino", descripcion: "Copiar con barra de progreso"},
    { categoria: "Archivos", cmd: "rm -rf ruta", descripcion: "Borrar sin preguntar"},
    { categoria: "Archivos", cmd: "mkdir -p a/b/c", descripcion: "Crear directorios recursivamente"},
    { categoria: "Archivos", cmd: "ln -s archivo link", descripcion: "Crear enlace simbolico"},
    { categoria: "Archivos", cmd: "find . -type f -size +100M", descripcion: "Buscar archivos grandes"},
    { categoria: "Archivos", cmd: "file archivo", descripcion: "Ver tipo de archivo"},

    { categoria: "Compresión", cmd: "tar -czvf a.tar.gz carpeta", descripcion: "Comprimir carpeta a .tar.gz"},
    { categoria: "Compresión", cmd: "tar -xzvf a.tar.gz", descripcion: "Descomprimir archivo .tar.gz"},
    { categoria: "Compresión", cmd: "tar -cjvf a.tar.bz2 carpeta", descripcion: "Comprimir carpeta a .tar.bz2"},
    { categoria: "Compresión", cmd: "zip -r a.zip carpeta", descripcion: "Comprimir carpeta a .zip"},
    { categoria: "Compresión", cmd: "unzip archivo.zip", descripcion: "Descomprimir archivo .zip"},
    { categoria: "Compresión", cmd: "7z a a.7z carpeta", descripcion: "Comprimir carpeta a .7z"},

    { categoria: "Permisos", cmd: "chmod +x script.sh", descripcion: "Hacer ejecutable un script"},
    { categoria: "Permisos", cmd: "chmod 755 script.sh", descripcion: "Hacer ejecutable y leer/escribir a todos los usuarios"},
    { categoria: "Permisos", cmd: "chmod 600 clave_ssh", descripcion: "Solo yo leo y escribo"},
    { categoria: "Permisos", cmd: "chown user:group archivo", descripcion: "Cambiar propietario y grupo de un archivo"},
    { categoria: "Permisos", cmd: "chown -R user:group carpeta", descripcion: "Cambiar propietario y grupo recursivamente de un directorio"},
    { categoria: "Permisos", cmd: "sudo !!", descripcion: "Ejecutar el comando anterior como root"},

    { categoria: "Arch", cmd: "sudo pacman -Syu", descripcion: "Actualizar TODO"},
    { categoria: "Arch", cmd: "sudo pacman -S paquete", descripcion: "Instalar un paquete"},
    { categoria: "Arch", cmd: "sudo pacman -Rs paquete", descripcion: "Desinstalar un paquete"},
    { categoria: "Arch", cmd: "sudo pacman -Rns paquete", descripcion: "Borrar paquete junto con sus archivos de configuración y dependencias"},
    { categoria: "Arch", cmd: "pacman -Si paquete", descripcion: "Info de paquete (repo)"},
    { categoria: "Arch", cmd: "pacman -Qi paquete", descripcion: "Info de paquete (instalado)"},
    { categoria: "Arch", cmd: "pacman -Qs paquete", descripcion: "Buscar paquete en repo"},
    { categoria: "Arch", cmd: "pacman -Qdtq | sudo pacman -Rns -", descripcion: "Borrar paquetes no utilizados"},
    { categoria: "Arch", cmd: "yay -S paquete", descripcion: "Instalar un paquete de AUR"},
    { categoria: "Arch", cmd: "yay -Rs paquete", descripcion: "Desinstalar un paquete de AUR"},
    { categoria: "Arch", cmd: "yay -Yc", descripcion: "Limpiar deps de AUR innecesarios"},
    { categoria: "Arch", cmd: "paccache -rk1", descripcion: "Limpiar cache de paquetes (dejar solo una version)"},

    { categoria: "Sistema", cmd: "systemctl start servicio", descripcion: "Iniciar servicio"},
    { categoria: "Sistema", cmd: "systemctl enable --now servicio", descripcion: "Iniciar servicio y habilitar en boot"},
    { categoria: "Sistema", cmd: "systemctl list-units --failed", descripcion: "Listar servicios fallidos"},
    { categoria: "Sistema", cmd: "journalctl -xeu servicio", descripcion: "Ver logs de servicio"},
    { categoria: "Sistema", cmd: "journalctl -p 3 -xb", descripcion: "Ver errores criticos del boot actual"},
    { categoria: "Sistema", cmd: "ps aux | grep proceso", descripcion: "Buscar proceso corriendo"},
    { categoria: "Sistema", cmd: "kill -9 PID", descripcion: "Matar proceso por su PID"},
    { categoria: "Sistema", cmd: "pkill -f nombre", descripcion: "Matar por nombre"},
    { categoria: "Sistema", cmd: "htop", descripcion: "Monitor de recursos"},
    { categoria: "Sistema", cmd: "btop", descripcion: "Monitor de recursos avanzado"},
    { categoria: "Sistema", cmd: "free -h", descripcion: "Ver RAM disponible"},

    { categoria: "Hardware", cmd: "lsblk", descripcion: "Ver arbol de discos y particiones"},
    { categoria: "Hardware", cmd: "df -h", descripcion: "Ver espacio libre en disco"},
    { categoria: "Hardware", cmd: "du -sh carpeta", descripcion: "Peso total de carpeta"},
    { categoria: "Hardware", cmd: "ncdu", descripcion: "Analizador de espacio interactivo"},
    { categoria: "Hardware", cmd: "fdisk -l", descripcion: "Listar tablas de particiones"},
    { categoria: "Hardware", cmd: "mkfs.ext4 /dev/sdX", descripcion: "Formatear a ext4"},
    { categoria: "Hardware", cmd: "mount /dev/sdX /mnt", descripcion: "Montar disco"},
    { categoria: "Hardware", cmd: "umount /mnt", descripcion: "Desmontar disco"},
    { categoria: "Hardware", cmd: "lspci", descripcion: "Ver dispositivos PCI (buses)"},
    { categoria: "Hardware", cmd: "lsusb", descripcion: "Ver dispositivos USB"},
    { categoria: "Hardware", cmd: "lscpu", descripcion: "Ver CPU"},
    { categoria: "Hardware", cmd: "uname -a", descripcion: "Ver información del kernel"},


];

class CheatState extends GObject.Object {
    static {
        GObject.registerClass({
            GTypeName: "CheatState",
            Properties: {
               'query': GObject.ParamSpec.string(
                   'query', 'Query', 'Search query',
                   GObject.ParamFlags.READWRITE,
                   ""
               ),
               'selectedIndex': GObject.ParamSpec.int(
                   'selectedIndex', 'SelectedIndex', 'Índice del comando seleccionado',
                   GObject.ParamFlags.READWRITE,
                   -1, 999, 0
               ),
               'revision': GObject.ParamSpec.int(
                   'revision', 'Revision', 'Revision para forzar actualizaciones',
                   GObject.ParamFlags.READWRITE,
                   0, 999999, 0
               ),
            },
        }, this);
    }

    #query: string = "";
    #selectedIndex: number = 0;
    #revision: number = 0;

    get query() {return this.#query;}

    set query(val: string) {
        if(this.#query !== val) {
            this.#query = val;
            this.#selectedIndex = 0;
            this.#revision++;
            this.notify("query");
            this.notify("selectedIndex");
            this.notify("revision");
        }
    }

    get selectedIndex() {return this.#selectedIndex;}

    set selectedIndex(val: number) {
        if(this.#selectedIndex !== val) {
            this.#selectedIndex = val;
            this.#revision++;
            this.notify("selectedIndex");
            this.notify("revision");
        }
    }

    get revision() {return this.#revision;}

    set revision(val: number) {
        this.#revision = val;
    }

    cycle(step: number, maxIndex: number) {
        let next = this.#selectedIndex + step;
        if (next > maxIndex) next = 0;
        if (next < 0) next = maxIndex;
        this.selectedIndex = next;
    }
}


const state = new CheatState();

export default function CheatSheet(gdkmonitor: Gdk.Monitor) {
    const queryBinding = createBinding(state, "query");
    const revision = createBinding(state, "revision");
    const hide = () => {
        App.toggle_window("cheatsheet");
        state.query = "";
        state.selectedIndex = 0;
    };

    const getFilteredCommands = () => {
        const search = state.query.toLowerCase();
        return COMMANDS.filter(c =>
            c.cmd.toLowerCase().includes(search) ||
            c.descripcion.toLowerCase().includes(search) ||
            c.categoria.toLowerCase().includes(search)
        );
    };

    const copyToClipboard = (cmd: string) => {
        execAsync(["bash", "-c", `echo -n "${cmd}" | wl-copy`])
            .then(() => {
                console.log(`Copiado al portapapeles: ${cmd}`);
                hide();
            }).catch(console.error);
    };

    const keyController = new Gtk.EventControllerKey();

    keyController.connect("key-pressed", (_: Gtk.EventControllerKey, keyval: number) => {
        if (keyval === Gdk.KEY_Escape) {
            hide();
            return true;
        }

        const filtered = getFilteredCommands();
        const maxIndex = filtered.length - 1;

        if (keyval === Gdk.KEY_Up || keyval === Gdk.KEY_KP_Up) {
            if (filtered.length > 0) {
                state.cycle(-1, maxIndex);
            }
            return true;
        }

        if (keyval === Gdk.KEY_Down || keyval === Gdk.KEY_KP_Down) {
            if (filtered.length > 0) {
                state.cycle(1, maxIndex);
            }
            return true;
        }

        if (keyval === Gdk.KEY_Return) {
            if (filtered.length > 0) {
                const selectedCmd = filtered[state.selectedIndex];
                if (selectedCmd) {
                    copyToClipboard(selectedCmd.cmd);
                }
            }
            return true;
        }

        return false;
    });


    const win = (
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
                            const filtered = getFilteredCommands();
                            if (filtered.length > 0) {
                                const selectedCmd = filtered[state.selectedIndex];
                                if (selectedCmd) {
                                    copyToClipboard(selectedCmd.cmd);
                                }
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
                    <With value={revision}>
                        {(_rev) => {
                            const search = state.query.toLowerCase();
                            const filtered = COMMANDS.filter(c =>
                            c.cmd.toLowerCase().includes(search) ||
                            c.descripcion.toLowerCase().includes(search) ||
                            c.categoria.toLowerCase().includes(search)
                            );

                            if (filtered.length === 0) {
                                return (
                                    <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} spacing={10} vexpand>
                                        <label label={"\u{f059}"} css="font-size: 48px; opacity: 0.5;" />
                                        <label label="No sé que estas buscando..." css="opacity: 0.7;" />
                                    </box>
                                );
                            }

                            const sel = state.selectedIndex;

                            return (
                                <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
                                    {filtered.map((item, index) => (
                                        <button
                                            class={sel === index ? "cheat-item selected" : "cheat-item"}
                                            focusable={false}
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
                                    ))}
                                </box>
                            );
                        }}
                    </With>
                </Gtk.ScrolledWindow>
            </box>

        </window>
    ) as Astal.Window;

    win.add_controller(keyController);

    return win;
}
