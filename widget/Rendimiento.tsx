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
                              max = 1,
                              format = (p: number) => `${Math.round(p * 100)}%`
                          }: {
    service: any,
    property: string,
    label: string,
    size?: number,
    lineWidth?: number,
    color?: string,
    max?: number,
    format?: (value: number, rawValue: number) => string
}) {
    const area = (
        <drawingarea
            widthRequest={size}
            heightRequest={size}
        />
    ) as Gtk.DrawingArea;


    area.set_draw_func((_: Gtk.DrawingArea, cr: Cairo.Context, width: number, height: number) => {
        const rawValue = service[property] || 0;
        const progress = Math.min(rawValue / max, 1);

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = (Math.min(width, height) - lineWidth) / 2 - lineWidth;

        cr.setOperator(Cairo.Operator.CLEAR);
        cr.paint();
        cr.setOperator(Cairo.Operator.OVER);

        cr.setSourceRGBA(0.2, 0.2, 0.2, 0.4);
        cr.setLineWidth(lineWidth);
        cr.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        cr.stroke();

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

        cr.setSourceRGBA(1, 1, 1, 1);
        cr.selectFontFace("Sans", Cairo.FontSlant.NORMAL, Cairo.FontWeight.BOLD);
        cr.setFontSize(size * 0.22);

        const mainText = format(progress, rawValue);
        const extents = cr.textExtents(mainText);
        cr.moveTo(centerX - extents.width / 2, centerY + extents.height / 2);
        cr.showText(mainText);

        cr.setFontSize(size * 0.12);
        cr.selectFontFace("Sans", Cairo.FontSlant.NORMAL, Cairo.FontWeight.NORMAL);
        const labelExtents = cr.textExtents(label);
        cr.moveTo(centerX - labelExtents.width / 2, centerY + extents.height / 2 + (size * 0.2));
        cr.showText(label);
    });

    const signalId = service.connect(`notify::${property}`, () => {
        area.queue_draw();
    });

    area.connect("destroy", () => {
        service.disconnect(signalId);
    });

    return area;
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
                    max={100}
                    format={( _, raw) => `${Math.round(raw)}°C`}
                />
            </box>
        </box>
    );
}