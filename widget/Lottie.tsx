import GLib from "gi://GLib";
import {Astal, Gdk} from "ags/gtk4";
import app from "ags/gtk4/app";
// @ts-ignore
import WebKit from "gi://WebKit?version=6.0";

interface LottieAnimationProps {
    fileName: string;
    size?: number;
    duration?: number;
}

export default function LottieAnimation({
                                            fileName,
                                            size = 400,
                                            duration = 3000
                                        }: LottieAnimationProps) {
    const configDir = `${GLib.get_user_config_dir()}/ags`;
    const jsonPath = `${configDir}/assets/${fileName}`;

    let animationData = "{}";
    try {
        const [success, contents] = GLib.file_get_contents(jsonPath);
        if (success) {
            const decoder = new TextDecoder('utf-8');
            animationData = decoder.decode(contents);
        }
    } catch (error) {
        console.error(`[Lottie] Error reading animation file:`, error);
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
            width: ${size}px;
            height: ${size}px;
        }
        .error {
            color: white;
            padding: 20px;
            font-family: monospace;
            text-align: center;
        }
    </style>
</head>
<body>
    <div id="lottie-container"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
    <script>
        const animationData = ${animationData};
        
        
        try {
            if (!animationData || !animationData.layers) {
                console.error('No animation data found');
            }
            
            const animation = lottie.loadAnimation({
                container: document.getElementById('lottie-container'),
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: animationData
            });
            
            
        } catch (error) {
            document.body.innerHTML = '<div class="error">Error loading animation:<br>' + error.message + '</div>';
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
    settings.set_javascript_can_access_clipboard(false);
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

    const lottieBox = (
        <box
            class="lottie-wrapper"
            css={`min-width: ${size}px;
                min-height: ${size}px;`}
        >
            {webview}
        </box>
    );

    const win = <window
        name="lottie-splash"
        visible={true}
        anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
        exclusivity={Astal.Exclusivity.IGNORE}
        keymode={Astal.Keymode.NONE}
        layer={Astal.Layer.OVERLAY}
        application={app}
        css="background-color: rgba(0, 0, 0, 0.8);"
    >
        {lottieBox}
    </window> as Astal.Window;

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, duration, () => {
        win.visible = false;
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            win.destroy();
            return GLib.SOURCE_REMOVE;
        });
        return GLib.SOURCE_REMOVE;
    });

    return win;
}
