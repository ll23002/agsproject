import Wp from "gi://AstalWp";
const wp = Wp.get_default();
const audio = wp.audio;
const speakers = audio.get_speakers();
if (speakers.length > 0) {
    const s = speakers[0];
    console.log("Speaker methods:", Object.keys(s.__proto__).filter(k => k.includes("default") || k.includes("set")));
    console.log("Audio methods:", Object.keys(audio.__proto__).filter(k => k.includes("default") || k.includes("set")));
}
