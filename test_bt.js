import Bluetooth from "gi://AstalBluetooth";
const bt = Bluetooth.get_default();
bt.get_devices().forEach(d => {
    console.log(d.name, d.address, d.connected);
    // Let's dump properties
    let props = [];
    for (let p in d) {
        if (typeof d[p] !== 'function') {
            try {
                props.push(`${p}: ${d[p]}`);
            } catch (e) {}
        }
    }
    console.log(props.join(", "));
});
