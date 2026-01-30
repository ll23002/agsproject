# AGS Project

## Restricciones y Limitaciones del Proyecto

### ❌ No permitido en Box
- `setup`
- `truncate`

###  Clases CSS
- Usar `class` en lugar de `className`

```tsx
<box class="mi-clase" />
```

### ️ Reactividad
No se puede usar:
- `bind` directamente
- `Variable` directamente

**Usar en su lugar:**
- `GObject`
- `createBinding()`
- `createMemo()`
- `With` para reactividad
```tsx
import { createBinding, createMemo, With } from "ags";
import GObject from "gi://GObject";
```



###  Importaciones y TypeScript
Se usa `ags/gtk4` para las importaciones principales. Módulos como `AstalHyprland`, `AstalBluetooth`, etc., siempre requieren `// @ts-ignore` porque no están disponibles en npm y el IDE los marcará como error.

```typescript
// Esto es correcto
import { App, Astal, Gtk } from "ags/gtk4"

// Estos siempre necesitan @ts-ignore
// @ts-ignore
import AstalHyprland from "gi://AstalHyprland"

// @ts-ignore
import AstalBluetooth from "gi://AstalBluetooth"

// @ts-ignore
import AstalNetwork from "gi://AstalNetwork"
```

Los errores de importación del IDE son **normales y esperados** para módulos GObject Introspection.


### Instalaciones
```bash
sudo pacman -S --needed base-devel git
sudo pacman -S gtk4 gjs gobject-introspection
yay -S libastal-meta
```
