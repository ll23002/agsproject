import { createBinding} from "ags"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
// @ts-ignore
import Notifd from "gi://AstalNotifd"
// @ts-ignore
import Network from "gi://AstalNetwork"
// @ts-ignore
import Bluetooth from "gi://AstalBluetooth"
import GLib from "gi://GLib"
import Cairo from "cairo"
// @ts-ignore
import Battery from "gi://AstalBattery";


function sys(cmd: string) {
    try {
        const [success, stdout] = GLib.spawn_command_line_sync(cmd);

        if ( !success ) return 0;
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
                              color = "#89b4fa"
    }: {
    label: string,
    getValueFn: () => number,
    size?: number,
    lineWidth?: number,
    color?: string
}) {
    const drawingArea = <drawingarea
        widthRequest={size}
        heightRequest={size}
        /> as Gtk.DrawingArea;

    const draw = (area: Gtk.DrawingArea, cr: any, width: number, height: number) =>{
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

        const hex = color.replace('#','');
        const r = parseInt(hex.substring(0,2), 16) / 255;
        const g = parseInt(hex.substring(2,4), 16) / 255;
        const b = parseInt(hex.substring(4,6), 16) / 255;

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

        const percentage =  `${Math.round(progress * 100)}%`;
        const extents = cr.textExtents(percentage);
        cr.moveTo(centerX - extents.width / 2, centerY + extents.height / 2);
        cr.showText(percentage);

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


export default function ControlPanel(gdkmonitor: Gdk.Monitor){
    const notifd = Notifd.get_default();
    const network = Network.get_default();
    const bluetooth = Bluetooth.get_default();
    const battery = Battery.get_default();

    const dndBinding = createBinding(notifd, "dontDisturb");
    const wifiBinding = createBinding(network.wifi, "enabled");
    const wifiSsid = createBinding(network.wifi, "ssid");
    const btBinding = createBinding(bluetooth, "isPowered");
    const batIconBinding = createBinding(battery, "iconName");
    const batLevelBinding = createBinding(battery, "percentage");

    let cpuValue = 0;
    let ramValue = 0;
    let batHealth = 0;

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
        const health = sys(cmd);
        batHealth = health;
        return batHealth;
        return batHealth;
    }

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
        getCpuUsage()
        getRamUsage()
        getBatHealth()
        return true;
    })

    getCpuUsage();
    getRamUsage();
    getBatHealth();

    const { TOP, RIGHT } = Astal.WindowAnchor;


    return <window
        visible
        name="control-panel"
        class="ControlPanel"
        gdkmonitor={gdkmonitor}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        anchor={TOP | RIGHT}
        application={app}
    >
        <box spacing={12}>
            <menubutton hexpand halign={Gtk.Align.CENTER}>
                <label label="󰒓" />

                <popover>
                    <box class="panel-container" orientation={Gtk.Orientation.VERTICAL} spacing={16}
                         widthRequest={300}>

                        <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                            <label label="Rendimiento" halign={Gtk.Align.START}
                                   css="font-weight: bold; margin-bottom: 5px;"/>

                            <box spacing={20} halign={Gtk.Align.CENTER}>
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
                            </box>
                        </box>

                        <Gtk.Separator />

                        <box class="controls-grid" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
                            <box spacing={10}>
                                <button
                                    hexpand
                                    widthRequest={145}
                                    heightRequest={60}
                                    onClicked={ () => network.wifi.enabled = !network.wifi.enabled}
                                    >
                                    <box spacing={8}>
                                        <label label={wifiBinding(e => e ? "󰤨" : "󰤭")}/>
                                        <label label={wifiSsid(s => s || "Desconectado")}/>
                                    </box>
                                </button>

                                <button
                                    hexpand
                                    widthRequest={145}
                                    heightRequest={60}
                                    onClicked={() => bluetooth.toggle()}
                                >
                                    <box spacing={8}>
                                        <label label={btBinding(p => p ? "󰂯" : "󰂲")}/>
                                        <label label={btBinding(p => p ? "Bluetooth\nOn" : "Bluetooth\nOff")}/>
                                    </box>
                                </button>
                            </box>

                            <box spacing={10}>
                                <button
                                    hexpand
                                    widthRequest={145}
                                    heightRequest={60}
                                    css={dndBinding(d => d ? "background-color: #f38ba8; color: black;" : "")}
                                    onClicked={() => notifd.set_dont_disturb(!notifd.dontDisturb)}
                                    >

                                    <box spacing={8}>
                                        <label label={dndBinding(d => d ? "󰂛" : "󰂚")}/>
                                        <label label="No Molestar"/>
                                    </box>
                                </button>


                                <button
                                    hexpand
                                    widthRequest={145}
                                    heightRequest={60}
                                >

                                    <box spacing={8}>
                                        <Gtk.Image iconName={batIconBinding(i => i)} />

                                        <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
                                            <label halign={Gtk.Align.START}
                                                   label={batLevelBinding(p => `Carga: ${Math.floor(p * 100)}%`)}/>
                                            <label halign={Gtk.Align.START}
                                                   css={batHealth < 50 ? "font-size: 10px; color: #ff5555; font-weight: bold;" : "font-size: 10px; color: #a6adc8;"}
                                                   label={`Salud: ${Math.round(batHealth)}%`} />
                                        </box>
                                    </box>
                                </button>

                            </box>

                        </box>


                    </box>
                </popover>
            </menubutton>
        </box>
    </window>


}