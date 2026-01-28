import { Gtk } from "ags/gtk4"
import GLib from "gi://GLib"
import Cairo from "cairo"

function sys(cmd: string) {
    try {
        const [success, stdout] = GLib.spawn_command_line_sync(cmd);
        if (!success) return 0;
        const decoder = new TextDecoder();
        const output = stdout ? decoder.decode(stdout) : "";
        return parseFloat(output.trim());
    } catch (e) {
        return 0;
    }
}

function CircularProgress({
                              label,
                              getValueFn,
                              size = 80,
                              lineWidth = 8,
                              color = "#89b4fa",
                              format = (p) => `${Math.round(p * 100)}%`
                          }: {
    label: string,
    getValueFn: () => number,
    size?: number,
    lineWidth?: number,
    color?: string,
    format?: (value: number) => string
}) {
    const drawingArea = <drawingarea
        widthRequest={size}
        heightRequest={size}
    /> as Gtk.DrawingArea;

    const draw = (area: Gtk.DrawingArea, cr: any, width: number, height: number) => {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = (Math.min(width, height) - lineWidth) / 2 - lineWidth;
        const progress = getValueFn();

        cr.setOperator(Cairo.Operator.CLEAR);
        cr.paint();
        cr.setOperator(Cairo.Operator.OVER);

        cr.setSourceRGBA(0.3, 0.3, 0.3, 0.3);
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
        cr.setFontSize(16);

        const mainText = format(progress);

        //const percentage = `${Math.round(progress * 100)}%`;
        const extents = cr.textExtents(mainText);
        cr.moveTo(centerX - extents.width / 2, centerY + extents.height / 2);
        cr.showText(mainText);

        cr.setFontSize(10);
        cr.selectFontFace("Sans", Cairo.FontSlant.NORMAL, Cairo.FontWeight.NORMAL);
        const labelExtents = cr.textExtents(label);
        cr.moveTo(centerX - labelExtents.width / 2, centerY + extents.height / 2 + 15);
        cr.showText(label);
    };


    drawingArea.set_draw_func(draw);

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
        drawingArea.queue_draw();
        return true;
    });

    return drawingArea;

}

export default function Rendimiento() {
    let cpuValue = 0;
    let ramValue = 0;
    let batHealth = 0;
    let tempValue = 0;

    const getCpuUsage = () => {
        const result = sys(`bash -c "grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'"`);
        cpuValue = result / 100;
        return cpuValue;
    };

    const getRamUsage = () => {
        ramValue = sys(`bash -c "free | awk '/Mem/ {print $3/$2}'"`);
        return ramValue;
    }

    const getBatHealth = () => {
        const cmd = `bash -c "echo $(( $(cat /sys/class/power_supply/BAT0/charge_full) * 100 / $(cat /sys/class/power_supply/BAT0/charge_full_design) ))"`;
        const health = sys(cmd)
        batHealth = health;
        return batHealth;
    }

    const getTemperature = () => {
        const temp = sys(`cat /sys/class/thermal/thermal_zone0/temp`);
        tempValue = (temp / 1000) / 100;
        return tempValue;
    }

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
        getCpuUsage()
        getRamUsage()
        getBatHealth()
        getTemperature()
        return true;
    })

    getCpuUsage();
    getRamUsage();
    getBatHealth();
    getTemperature();

    return (
        <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
            <label label="Rendimiento" halign={Gtk.Align.START}
                   css="font-weight: bold; margin-bottom: 5px;" />

            <box spacing={15} halign={Gtk.Align.CENTER}>
                <CircularProgress
                    getValueFn={() => cpuValue}
                    label="CPU"
                    color="#89b4fa"
                />
                <CircularProgress
                    getValueFn={() => ramValue}
                    label="RAM"
                    color="#f38ba8"
                />
                <CircularProgress
                    getValueFn={() => tempValue}
                    label="TEMP"
                    color="#fab387"
                    format={(p) => `${Math.round(p * 100)}°C`}
                />
            </box>
        </box>
    );
}

