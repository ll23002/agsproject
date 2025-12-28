import app from "ags/gtk4/app"
import style from "./style.scss"
import Calendar from "./widget/Calendar";
import ControlPanel from "./widget/controlPanel"
import TopHover from "./widget/TopHover"
// Importamos Hyprland para interrogarlo directamente
// @ts-ignore
import Hyprland from "gi://AstalHyprland";

app.start({
  css: style,
  main() {
    // --- ZONA DE DEBUGGING (El Chismoso) ---
    const hypr = Hyprland.get_default();

    // Conectamos directamente a la señal nativa, sin intermediarios 'createBinding'
    hypr.connect("notify::focused-client", () => {
      const cliente = hypr.focusedClient;
      console.log(`[DEBUG HYPRLAND] Cliente enfocado: ${cliente ? cliente.class : "NINGUNO (Escritorio Vacio)"}`);
    });
    // ----------------------------------------

    app.get_monitors().map(monitor => {
      TopHover(monitor)
      ControlPanel(monitor)
      Calendar(monitor)
    })
  },
})