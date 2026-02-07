import { Astal } from "ags/gtk4";
//@ts-ignore
import Battery from "gi://AstalBattery";
import app from "ags/gtk4/app";
import GLib from "gi://GLib";
//@ts-ignore
import {Gdk} from "ags/gtk4";
//@ts-ignore
import WebKit from "gi://WebKit?version=6.0";

export default function ChargingOverlay() {
    const bat = Battery.get_default();
    let currentWindow: Astal.Window | null = null;

    const showChargingAnimation = () => {
        if (currentWindow) {
            return;
        }

        const configDir = `${GLib.get_user_config_dir()}/ags`;
        const jsonPath = `${configDir}/assets/charging.json`;

        let animationData = "{}";
        try {
            const [success, contents] = GLib.file_get_contents(jsonPath);
            if (success) {
                const decoder = new TextDecoder('utf-8');
                animationData = decoder.decode(contents);
            }
        } catch (error) {
            console.error(`[ChargingOverlay] Error reading animation file:`, error);
        }

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            width: 100vw;
        }
        #lottie-container {
            width: 400px;
            height: 400px;
        }
    </style>
</head>
<body>
    <div id="lottie-container"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
    <script>
        const animationData = ${animationData};
        
        console.log('[ChargingOverlay Lottie] Animation data:', animationData);
        
        try {
            if (!animationData || !animationData.layers) {
                throw new Error('Invalid animation data');
            }
            
            const animation = lottie.loadAnimation({
                container: document.getElementById('lottie-container'),
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: animationData
            });
            
            console.log('[ChargingOverlay Lottie] Animation loaded successfully');
            
        } catch (error) {
            console.error('[ChargingOverlay Lottie] Error:', error);
        }
    </script>
</body>
</html>
`;

        const webview = new WebKit.WebView();

        const settings = webview.get_settings();
        settings.set_enable_javascript(true);
        settings.set_enable_write_console_messages_to_stdout(true);
        settings.set_allow_universal_access_from_file_urls(true);
        settings.set_allow_file_access_from_file_urls(true);
        settings.set_enable_developer_extras(true);

        webview.load_html(html, null);
        webview.set_hexpand(true);
        webview.set_vexpand(true);

        const rgba = new Gdk.RGBA();
        rgba.red = 0;
        rgba.green = 0;
        rgba.blue = 0;
        rgba.alpha = 0;
        webview.set_background_color(rgba);

        const win = <window
            name="charging-overlay-lottie"
            namespace="charging-overlay-lottie"
            class="charging-overlay-window"
            layer={Astal.Layer.OVERLAY}
            exclusivity={Astal.Exclusivity.IGNORE}
            keymode={Astal.Keymode.NONE}
            visible={true}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
            application={app}
            css="background-color: rgba(0, 0, 0, 0.8);"
        >
            <box
                css="min-width: 400px; min-height: 400px;"
            >
                {webview}
            </box>
        </window> as Astal.Window;

        currentWindow = win;

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
            if (currentWindow) {
                currentWindow.visible = false;
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                    if (currentWindow) {
                        currentWindow.destroy();
                        currentWindow = null;
                    }
                    return GLib.SOURCE_REMOVE;
                });
            }
            return GLib.SOURCE_REMOVE;
        });

        return win;
    };

    bat.connect("notify::charging", () => {
        if (bat.charging) {
            console.log("[ChargingOverlay] Charger connected - showing animation");
            showChargingAnimation();
        }
    });

    return <window
        name="charging-overlay-placeholder"
        visible={false}
        application={app}
    >
        <box />
    </window> as Astal.Window;
}