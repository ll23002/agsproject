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

]
