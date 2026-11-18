import React from 'react';
import {InlineName} from './controls.jsx';
import {ChannelDot} from './channel-dot.jsx';
import {MixerSettings} from './mixer-settings.jsx';
import {MixerRoute} from './mixer-route.jsx';
import {X} from './ui-icons.jsx';
import {routeDestinations} from './routing.js';
import {TRACK_COLORS as COLORS} from './editing.js';
import {faderTicks} from './workspace-layout.js';
export const MixerStrip=React.memo(function MixerStrip({ch,i,context,volume,pan,separation,left,right,selected,dimmed,recording,options}){
 const setSelected=(...args)=>context.current.setSelected(...args),setCollapsed=(...args)=>context.current.setCollapsed(...args),changeTrack=(...args)=>context.current.changeTrack(...args),soloMixerChannel=(...args)=>context.current.soloMixerChannel(...args),deleteMixerChannel=(...args)=>context.current.deleteMixerChannel(...args),deleteBus=(...args)=>context.current.deleteBus(...args);

    const isMaster = ch.id === "master", isBus = ch.kind === "bus";
    return /* @__PURE__ */ React.createElement("div", { key: ch.id, style: { "--channel": ch.color || COLORS[Math.max(0, i) % COLORS.length] }, className: "mixer-strip " + (isMaster ? "master-strip " : "") + (isBus ? "bus-strip " : "") + (dimmed ? "solo-dimmed " : "") + (selected ? "channel-selected" : ""), onClick: () => setSelected(ch.id) }, /* @__PURE__ */ React.createElement("div", { className: "channel-name", role: "button", tabIndex: 0, title: ch.name, onClick: () => {
      setSelected(ch.id);
      setCollapsed(false);
    }, onKeyDown: (e) => {
      if (e.key === "Enter") {
        setSelected(ch.id);
        setCollapsed(false);
      }
    } }, /* @__PURE__ */ React.createElement("small", null, isMaster ? "OUT" : isBus ? "BUS" : String(ch.mixerIndex || i).padStart(2, "0")), /* @__PURE__ */ React.createElement(InlineName, { label: "Rename " + ch.name + " in mixer", value: ch.name, onChange: (name) => changeTrack(ch.id, { name }) })), /* @__PURE__ */ React.createElement("b", { className: "channel-db" }, volume ? (20 * Math.log10(volume)).toFixed(1) : "−∞", " dB"), /* @__PURE__ */ React.createElement("div", { className: "channel-level" }, /* @__PURE__ */ React.createElement("div", { className: "channel-meter stereo-meter", "data-meter-channel":ch.id, "aria-label": ch.name + " stereo levels" }, ["left", "right"].map((side) => /* @__PURE__ */ React.createElement("div", { className: "stereo-meter-lane", key: side }, /* @__PURE__ */ React.createElement("i", { "data-side": side, style: { height: Math.min(100,(side === "left" ? left : right)*100)+"%" } }), /* @__PURE__ */ React.createElement("span", null, side === "left" ? "L" : "R")))), /* @__PURE__ */ React.createElement("input", { "data-channel": ch.id, "data-param": "volume", className: "channel-fader", "aria-label": ch.name + " mixer volume", type: "range", min: "0", max: "1.5", step: ".01", value: volume, onChange: (e) => changeTrack(ch.id, { volume: +e.target.value }), onDoubleClick: () => changeTrack(ch.id, { volume: 1 }) }), /* @__PURE__ */ React.createElement("span", { className: "fader-scale", "aria-hidden": "true" }, faderTicks.map((tick) => /* @__PURE__ */ React.createElement("i", { key: tick.label, style: { bottom: tick.position } }, tick.label)))), /* @__PURE__ */ React.createElement("div", { className: "mixer-controls" }, /* @__PURE__ */ React.createElement(ChannelDot, { name: ch.name, muted: ch.mute, solo: ch.solo, disabled: recording, onMute: () => changeTrack(ch.id, { mute: !ch.mute }), onSolo: () => soloMixerChannel(ch.id) }), /* @__PURE__ */ React.createElement("div", { className: "mixer-pan" }, /* @__PURE__ */ React.createElement("input", { type: "range", "aria-label": ch.name + " mixer pan", title: "Pan · Double-click to center · Right-click to automate", "data-channel": ch.id, "data-param": "pan", min: "-1", max: "1", step: ".01", value: pan, onChange: (e) => changeTrack(ch.id, { pan: +e.target.value }), onDoubleClick: () => changeTrack(ch.id, { pan: 0 }) }), /* @__PURE__ */ React.createElement("span", { className: "pan-center", "aria-hidden": "true" })), /* @__PURE__ */ React.createElement(MixerSettings, { channel: ch, onOpen: () => setSelected(ch.id), separationValue: separation, disabled: recording, onChange: (changes) => changeTrack(ch.id, changes), onDelete:ch.id==='master'?undefined:()=>deleteMixerChannel(ch.id) })), isMaster ? /* @__PURE__ */ React.createElement("small", { className: "route-label" }, "Stereo output") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(MixerRoute, { name: ch.name, destinations: routeDestinations(ch), onDestinationsChange: (outputs) => changeTrack(ch.id, { outputs, outputMaster: false }), disabled: recording, value: ch.output || "master", options: options, onChange: (output) => changeTrack(ch.id, { output }) }), isBus && /* @__PURE__ */ React.createElement("button", { title: "Delete " + ch.name, onClick: (e) => {
      e.stopPropagation();
      deleteBus(ch.id);
    } }, /* @__PURE__ */ React.createElement(X, { size: 10 }))));
  
});
