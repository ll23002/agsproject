import { Gtk } from "ags/gtk4"
import Cairo from "cairo"
import Performance from "../service/Performance"

function CircularProgress({
                              service,
                              property,
                              label,
                              size = 70,
                              lineWidth = 6,
                              color = "#89b4fa",
                              format = (p: number) => `${Math.round(p * 100)}%`
                          }: {
    service: any, // GObject
    property: string,
    label: string,
    size?: number,
    lineWidth?: number,
    color?: string,
    format?: (value: number) => string
}) {
    // 1. Creamos el widget base
    const da = (
        <drawingarea
            widthRequest={size}
            heightRequest={size}
        />
    ) as Gtk.DrawingArea;

    //@ts-ignore
    da.set_draw_func((_, cr, width, height) => {
        // Obtenemos el valor actual directamente del servicio
        const progress = service[property] || 0;

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = (Math.min(width, height) - lineWidth) / 2 - lineWidth;

        // Limpiar
        cr.setOperator(Cairo.Operator.CLEAR);
        cr.paint();
        cr.setOperator(Cairo.Operator.OVER);

        // Fondo (Track)
        cr.setSourceRGBA(0.2, 0.2, 0.2, 0.4);
        cr.setLineWidth(lineWidth);
        cr.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        cr.stroke();

        // Indicador (Color)
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        cr.setSourceRGBA(r, g, b, 1);
        cr.setLineWidth(lineWidth);
        cr.setLineCap(Cairo.LineCap.ROUND);

        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (progress * 2 * Math.PI);
        cr.arc(centerX, centerY, radius, startAngle, endAngle);
        cr.stroke();

        // Texto
        cr.setSourceRGBA(1, 1, 1, 1);
        cr.selectFontFace("Sans", Cairo.FontSlant.NORMAL, Cairo.FontWeight.BOLD);
        cr.setFontSize(size * 0.22);

        const mainText = format(progress);
        const extents = cr.textExtents(mainText);
        cr.moveTo(centerX - extents.width / 2, centerY + extents.height / 2);
        cr.showText(mainText);

        // Etiqueta
        cr.setFontSize(size * 0.12);
        cr.selectFontFace("Sans", Cairo.FontSlant.NORMAL, Cairo.FontWeight.NORMAL);
        const labelExtents = cr.textExtents(label);
        cr.moveTo(centerX - labelExtents.width / 2, centerY + extents.height / 2 + (size * 0.2));
        cr.showText(label);
    });

    // 3. Conexión REACTIVA (Sin hooks raros)
    // Conectamos a la señal nativa de GObject "notify::nombre_propiedad"
    const signalId = service.connect(`notify::${property}`, () => {
        da.queue_draw(); // Pedimos redibujar solo cuando cambia el dato
    });

    // 4. Limpieza automática
    da.connect("destroy", () => {
        service.disconnect(signalId);
    });

    return da;
}

export default function PerformanceWidget() {
    return (
        <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
            <label
                label="Rendimiento"
                halign={Gtk.Align.START}
                css="font-weight: bold; font-size: 14px; margin-bottom: 4px;"
            />

            <box spacing={15} halign={Gtk.Align.CENTER}>
                <CircularProgress
                    service={Performance}
                    property="cpu"
                    label="CPU"
                    color="#89b4fa"
                />
                <CircularProgress
                    service={Performance}
                    property="ram"
                    label="RAM"
                    color="#f38ba8"
                />
                <CircularProgress
                    service={Performance}
                    property="temp"
                    label="TEMP"
                    color="#fab387"
                    format={(p) => `${Math.round(p)}°C`}
                />
            </box>
        </box>
    );
}