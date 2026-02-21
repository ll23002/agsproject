import Wp from "gi://AstalWp";
const wp = Wp.get_default();
const audio = wp.audio;
const speakers = audio.get_speakers();
speakers.forEach(s => {
    console.log("Speaker:", s.description, "ID:", s.id, "Vol:", s.volume, "Mute:", s.mute, "Default:", audio.default_speaker === s);
});
