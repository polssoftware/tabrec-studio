import {useVisibleMeterChannels} from './visible-meter-channels.jsx';
import {MixerStrip} from './mixer-strip.jsx';
import {routingChoices} from './routing.js';
import {assignMixerTarget,targetIndex,makeMixerChannel,migrateMixerProject,mixerChannels as independentMixers} from './mixer-targets.js';
import {MixerTargetControl} from './mixer-target-control.jsx';
import {MAX_TRACKS} from './project-limits.js';
import {useMobileLayout,MobileHeader,MobileDock,MobileControlsBar} from './mobile-ui.jsx';
import {NativeEffectPanel} from './native-effect-panel.jsx';
import {TrackVolume} from './track-volume.jsx';
import {emitControlPreview,previewText} from './control-preview.js';
import {demoEffects} from './demo-presets.js';
import {ZOOM_DEFAULT,ZOOM_MIN,ZOOM_MAX} from './zoom.js';
import {TransportLayout} from './transport-layout.jsx';
import {MasterAutomationHeader,MasterAutomationLane} from './master-automation.jsx';
import {useTrackHeaderResize} from './track-header-resize.jsx';
import {HorizontalScroller} from './horizontal-scroll.jsx';
import {EffectPicker} from './effect-picker.jsx';
import {availableProjectSave,writeProjectFile} from './save-location.js';
import {STUDIO_EFFECTS} from './studio-effects.js';
import {StudioEffectPanel} from './studio-effect-panel.jsx';
import {applyEqAudition} from './eq-audition.js';
import {extraRanges} from './effect-parameters.js';
import {ParametricEqPanel,EffectKnob} from './eq-panel.jsx';
import {ExportOptions} from './export-ui.jsx';
import {EXPORT_PRESETS,exportMime,exportSuffix} from './export-options.js';
import {encodeExport} from './export-client.js';
import {StudioLogo,STUDIO_NAME} from './studio-brand.jsx';
import {newStatistics} from './project-statistics.js';
import {useProjectStatistics,StatisticsDialog,MicrophoneMeter} from './session-tools.jsx';
import {editableTrack,clipsInRectangle,selectionIds,moveSelection,adjustSelection} from './clip-selection.js';
import React,{useState,useRef,useEffect,useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {zipSync} from 'fflate';
import {ThemedIcon,SecretText} from './secret-icons.jsx';
import {TriangleAlert,Globe,Flag,Activity,Plus,Save,Play,Pause,Square,Mic,Headphones,Undo2,Redo2,Scissors,Copy,Trash2,ZoomIn,ZoomOut,ChevronDown,Settings2,Menu,X,ChevronUp,Repeat2,Power,Maximize,Minimize,Lock,ExternalLink,Workflow,RefreshCw,Layers,Magnet,Snowflake,FolderInput,FileOutput,RotateCcw,Timer,ArrowRightToLine,AudioLines,Github,Sparkles,FileText,Download,Youtube,Twitter,Instagram,MessageCircle} from './ui-icons.jsx';
import {defaults,makeTrack,wav,validateEffects,validateProject,graph,initGate} from './audio.js';
import {masterChannel,audibleTrack,updateMix,buildMix,effectTail} from './mixer.js';
import {TRACK_COLORS,pickTrackColor,moveClipPosition,snapTime,layoutRows,valueAt,fadeAt,clipGain,clipGainHandleX,scheduleClip,scheduleAutomation,renderTransform} from './editing.js';
import {channelList,routeDestinations,routePath,canRoute,validateRouting,routeAudible,routeEdgeAudible,removeRoute} from './routing.js';
import {AutomationLane} from './editor-ui.jsx';
import {MIXER_STRIP_WIDTH,ModalBackdrop,ZoomCounter,InlineName,BpmCounter,ScrubNumber,TempoGrid,KeySelector,MetronomeIcon,RecordIcon,MixerCables,EffectHeader} from './controls.jsx';
import {runCountIn} from './count-in.js';
import {runCleanupWorker} from './cleanup-client.js';
import {processCleanup,mapCleanedTime,floatWav} from './cleanup-dsp.js';
import {latencyEstimate,makeProbe,detectLoopback,measureLoopback} from './latency.js';
import {reorderEffects,effectHasChanges} from './effect-settings.js';
import {nearestZeroCrossing,sliceRegion,replaceRecording,soloChannel,audibleRegions,clipsFromRegions,stretchChannels} from './playlist-editing.js';
import {tempoAt,beatPosition,beatTime,snapProjectTime} from './tempo.js';
import {VisualizerRack} from './visualizers.jsx';
import {isCrossfade,resolveClipPriority,markerRange,exportBounds,bufferRange,waveformViewport,fourBarBands} from './arrangement.js';
import {tempoClipBounds,warpTempoChannels} from './tempo-audio.js';
import {nextProjectSave} from './project-names.js';
import {MixerPopout} from './mixer-popout.jsx';
import {dockPresence,defaultHeights,resizedHeight,faderPosition,faderTicks,enabledAutomations} from './workspace-layout.js';
import {ChannelDot} from './channel-dot.jsx';
import {MixerRoute} from './mixer-route.jsx';
import {attachStereoMeters,readStereoMeters} from './stereo-meters.js';
import {MixerSettings} from './mixer-settings.jsx';
import {stereoSeparation,stereoCoefficients,updateStereoMatrix,createStereoMatrix,stereoAutomationBindings} from './channel-stereo.js';
import './style.css';
import './mobile.css';
const COLORS = TRACK_COLORS;
const FX_NAMES = { ...Object.fromEntries(Object.entries(STUDIO_EFFECTS).map(([key,e])=>[key,e.name])), autotune:"Autotune",eq7:"Parametric EQ",eq: "Three-Band EQ", compressor: "Compressor", gate: "Noise gate", reverb: "Reverb", delay: "Delay" };
const TOOL_NAMES = { trim: "Trim Silence", declick: "De-click", dehum: "De-hum", dereverb: "De-reverb", declip: "De-clip" };
const TOOL_DESCRIPTIONS = { trim: "Remove silent regions as separate clips on the same track. Source files and timeline positions stay intact.", declick: "Reduce isolated clicks and short sample spikes.", dehum: "Reduce mains hum and its harmonics.", dereverb: "Reduce lingering spectral tails. Sustained sounds may also soften.", declip: "Estimate flattened peaks. Lost detail cannot be fully recovered." };
const FX_DESCRIPTIONS = { ...Object.fromEntries(Object.entries(STUDIO_EFFECTS).map(([key,e])=>[key,e.description])), autotune:"Monophonic vocal pitch correction following the project key and scale.",eq7:"Seven fully parametric peaking bands with frequency, gain and Q.",eq: "Adjust bass, midrange and treble tone.", compressor: "Reduce dynamic range to even out loud and quiet audio.", gate: "Reduce background noise below the threshold.", reverb: "Add room reflections and a reverberant tail.", delay: "Repeat audio with adjustable timing, feedback and mix." };
const migrate=track=>({...track,effects:(track.effects??['gate','eq','compressor','reverb','delay'].filter(type=>track.fx?.[type]).map(type=>({id:crypto.randomUUID(),type,enabled:true,params:track.fx}))).map(effect=>({...effect,params:{...defaults(),...effect.params,...effect.type==='reverb'&&effect.params?.reverbDry===undefined?{reverbDry:100-(effect.params?.mix??20)}:{}}}))});
const initial = () => ({ statistics:newStatistics(), stretchMode: "resample", notes: "", name: "Untitled project", bpm: 120, master: 1, masterChannel: { id: "master", name: "Master", pan: 0, mute: false, effects: [] }, mixerChannels: [], buses: [], groups: [], snap: true, gridDivision:4, tracks: [], clips: [], signature: "4/4", scale: "Chromatic", key: "C", loop: { enabled: false, start: 0, end: 8 }, editOptions: { showFades: false, zeroCrossing: true, stretch: false }, markers: [], masterLaneVisible:false,masterLaneCollapsed:true,masterLaneParam:"volume",tempoAutomation: [], tempoLaneVisible: false, tempoLaneCollapsed: true, effectsBypass: false, presets: [], lastSaved: null });
const stamp = (t2) => `${String(Math.floor(t2 / 60)).padStart(2, "0")}:${(t2 % 60).toFixed(2).padStart(5, "0")}`;
const drawnIcons = /* @__PURE__ */ new Map([[ZoomOut, "zoom-out"], [ZoomIn, "zoom-in"], [Magnet, "snap"], [Undo2, "undo"], [Redo2, "redo"], [Scissors, "slice"], [Copy, "duplicate"], [Trash2, "trash"], [Play, "play"], [Square, "stop"], [RecordIcon, "record"]]);
function IconButton({ icon: Icon, iconSize = 15, children, ...props }) {
  return /* @__PURE__ */ React.createElement("button", { ...props }, drawnIcons.has(Icon) ? /* @__PURE__ */ React.createElement(ThemedIcon, { name: drawnIcons.get(Icon), Fallback: Icon, size: iconSize }) : /* @__PURE__ */ React.createElement(Icon, { size: iconSize }), children);
}
function Wave({ buffer, offset, duration, color, fadeIn = 0, fadeOut = 0, gainDb = 0, zoom = 40, clipStart = 0, view, visualDuration = duration }) {
  const ref = useRef(null), viewport = waveformViewport(clipStart, visualDuration, zoom, view);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !buffer) return;
    const draw = () => {
      const w = Math.max(1, Math.ceil(viewport.width)), h = canvas.clientHeight || 49, dpr = globalThis.devicePixelRatio || 1;
      canvas.width = Math.ceil(w * dpr);
      canvas.height = Math.ceil(h * dpr);
      const x = canvas.getContext("2d");
      x.scale(dpr, dpr);
      x.strokeStyle = color;
      x.lineWidth = 1.3;
      const data = buffer.getChannelData(0);
      x.beginPath();
      for (let i = 0; i < w; i += 3) {
        const fraction = (viewport.left + i) / viewport.full, a = Math.floor((offset + fraction * duration) * buffer.sampleRate), b = Math.min(data.length, Math.floor((offset + (viewport.left + i + 3) / viewport.full * duration) * buffer.sampleRate));
        let peak = 0;
        for (let j = a; j < b; j += Math.max(1, Math.floor((b - a) / 100))) peak = Math.max(peak, Math.abs(data[j] || 0));
        const amplitude = peak * h * 0.43 * fadeAt({ duration: visualDuration, fadeIn, fadeOut }, fraction * visualDuration) * clipGain({ gainDb });
        x.moveTo(i, h / 2 - amplitude);
        x.lineTo(i, h / 2 + amplitude);
      }
      x.stroke();
    };
    draw();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(draw) : null;
    observer == null ? void 0 : observer.observe(canvas);
    return () => observer == null ? void 0 : observer.disconnect();
  }, [buffer, offset, duration, color, fadeIn, fadeOut, gainDb, zoom, viewport.left, viewport.width, viewport.full, visualDuration]);
  return /* @__PURE__ */ React.createElement("canvas", { ref, style: { position: "relative", left: viewport.left, width: viewport.width } });
}
function Knob({ value, onChange, label, channel, param = "pan" }) {
  return /* @__PURE__ */ React.createElement("div", { className: "pan-knob", "data-channel": channel, "data-param": param, role: "slider", tabIndex: 0, "aria-label": label, "aria-valuemin": -1, "aria-valuemax": 1, "aria-valuenow": value, title: "Pan · drag up/down · double-click to center", onDoubleClick: () => onChange(0), onKeyDown: (e) => {
    if (["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "Home"].includes(e.key)) {
      e.preventDefault();
      onChange(e.key === "Home" ? 0 : Math.max(-1, Math.min(1, value + (["ArrowUp", "ArrowRight"].includes(e.key) ? 0.05 : -0.05))));
    }
  }, onPointerDown: (e) => {
    var _a, _b;
    e.preventDefault();
    const dragWindow = ((_b = (_a = e.currentTarget) == null ? void 0 : _a.ownerDocument) == null ? void 0 : _b.defaultView) || window;
    const y = e.clientY, v = value;
    const move = (ev) => {const next=Math.max(-1,Math.min(1,v+(y-ev.clientY)/70));onChange(next);emitControlPreview({label,value:next,min:-1,max:1,channel,param});};
    const up = () => {
      dragWindow.removeEventListener("pointermove", move);
      dragWindow.removeEventListener("pointerup", up);
    };
    dragWindow.addEventListener("pointermove", move);
    dragWindow.addEventListener("pointerup", up);
  } }, /* @__PURE__ */ React.createElement("i", { style: { transform: "rotate(" + value * 135 + "deg)" } }), /* @__PURE__ */ React.createElement("small", null, value === 0 ? "C" : Math.round(Math.abs(value) * 100) + (value < 0 ? "L" : "R")));
}
export function App() {
  var _a, _b, _c, _d, _e, _f;
  const mobile=useMobileLayout();
  const [mobileDockHidden,setMobileDockHidden]=useState(false);
  const [p, setP] = useState(initial), [selected, setSelected] = useState(null), [clipId, setClipId] = useState(null), [cursor, setCursor] = useState(0), [playing, setPlaying] = useState(false), [recording, setRecording] = useState(false), [zoom, setZoom] = useState(mobile?ZOOM_DEFAULT/2:ZOOM_DEFAULT), [metro, setMetro] = useState(false), [monitor, setMonitor] = useState(false), [devices, setDevices] = useState([]), [device, setDevice] = useState(""), [latency, setLatency] = useState(0), [settings, setSettings] = useState(false), [status, setStatus] = useState("Ready when you are"), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [revision, setRevision] = useState(0), [history, setHistory] = useState({ undo: [], redo: [] }), [meters, setMeters] = useState({}), [masterPeaks, setMasterPeaks] = useState([0, 0]), [clipped, setClipped] = useState(false);
  const [menu, setMenu] = useState(false), [dialog, setDialog] = useState(null), [collapsed, setCollapsed] = useState(mobile), [trackMenu, setTrackMenu] = useState(null), [addFx, setAddFx] = useState(false), [format, setFormat] = useState("wav"), [exportMode, setExportMode] = useState("mixdown");
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("daw-theme") || "dark";
    } catch {
      return "dark";
    }
  }), [saveClock, setSaveClock] = useState(Date.now()), [mixerOpen, setMixerOpen] = useState(!mobile);
  useEffect(() => {
    const id = setInterval(() => setSaveClock(Date.now()), 3e5);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("daw-theme", theme);
    } catch {
    }
  }, [theme]);
  const [automation, setAutomation] = useState(null), [effectsMenu, setEffectsMenu] = useState(false), [helpClosed, setHelpClosed] = useState(false), [help, setHelp] = useState({ label: "Message box", text: "Hover a control for its value and description. Right-click a fader or knob to edit automation." }), [pitch, setPitch] = useState(0), [exportTarget, setExportTarget] = useState(null), [saveName, setSaveName] = useState("");
  const [renaming, setRenaming] = useState(null), [closedEffects, setClosedEffects] = useState({}), [countIn, setCountIn] = useState(false), [countdown, setCountdown] = useState(0), [recordStarting, setRecordStarting] = useState(false);
  const [effectToRemove, setEffectToRemove] = useState(null);
  const workspace = "compact";
  const [reorderingFx, setReorderingFx] = useState(null);
  const reorderCleanup = useRef(null);
  useEffect(() => () => {
    var _a2;
    return (_a2 = reorderCleanup.current) == null ? void 0 : _a2.call(reorderCleanup);
  }, []);
  const [controlsOpen, setControlsOpen] = useState(false), [autoScroll, setAutoScroll] = useState(false), [timelineView, setTimelineView] = useState({ left: 0, width: 0 }), [fxInsert, setFxInsert] = useState(null),[fxAnchor,setFxAnchor]=useState(null);
  const [toolsOpen, setToolsOpen] = useState(false), [cleanupType, setCleanupType] = useState("declick"), [cleanupTrack, setCleanupTrack] = useState(""), [cleanupOptions, setCleanupOptions] = useState({ strength: 70, humHz: 60, threshold: -45, minimumMs: 500, retainMs: 100 }), [toolsError, setToolsError] = useState(""), [toolRunning, setToolRunning] = useState(false);
  const [latencyResult, setLatencyResult] = useState(null), [latencyRunning, setLatencyRunning] = useState(false);
  const clipboard = useRef(null), shortcutHandler = useRef(null), cleanupAbort = useRef(null), latencyAbort = useRef(null), autoScrollRef = useRef(false), zoomRef = useRef(zoom);
  autoScrollRef.current = autoScroll;
  zoomRef.current = zoom;
  useEffect(() => () => {
    var _a2, _b2;
    (_a2 = cleanupAbort.current) == null ? void 0 : _a2.abort();
    (_b2 = latencyAbort.current) == null ? void 0 : _b2.abort();
  }, []);
  const [visualizersOpen, setVisualizersOpen] = useState(false);
  const [recordArmed, setRecordArmed] = useState(false), [playlistOptions, setPlaylistOptions] = useState(false), [markerEdit, setMarkerEdit] = useState(null), [notepadOpen, setNotepadOpen] = useState(false);
  const [notes, setNotes] = useState("");
  useEffect(()=>{if(typeof document==='undefined')return;const suppress=e=>e.preventDefault();document.addEventListener('contextmenu',suppress);return()=>document.removeEventListener('contextmenu',suppress);},[]);
  const recordingBuffer = useRef(null);
  const eqEdit=useRef(null);
  function beginEqEdit(id){if(!eqEdit.current)eqEdit.current={id,before:project.current};}
  function endEqEdit(cancel=false){const edit=eqEdit.current;if(!edit)return;eqEdit.current=null;if(cancel){project.current=edit.before;setP(edit.before);}else if(project.current!==edit.before){setHistory(h=>({undo:[...h.undo.slice(-39),edit.before],redo:[]}));setDirty(true);}}
  function changeEqParameters(channelId,id,changes){const state=project.current,channel=[...channelList(state),masterChannel(state)].find(t=>t.id===channelId);if(!channel)return;const effects=channel.effects.map(item=>item.id===id?{...item,params:{...item.params,...changes}}:item),next=changedChannel(state,channelId,{effects});if(eqEdit.current?.id===id){project.current=next;setP(next);}else commit(next);}

  const [eqAudition,setEqAudition]=useState({}),eqAuditionRef=useRef({});
  function soloEqBand(id,band){const previous=eqAuditionRef.current;if(!band&&!previous[id])return;const next=band?{[id]:band}:{...previous};if(!band)delete next[id];eqAuditionRef.current=next;setEqAudition(next);applyEqAudition(runtime.current,next);}

  const [exportChoices,setExportChoices]=useState(['wav-24']),[flacLevel,setFlacLevel]=useState(5);const exportAbort=useRef(null);
  useEffect(()=>()=>exportAbort.current?.abort(),[]);
  const [selectedClips,setSelectedClips]=useState([]),[selectionBox,setSelectionBox]=useState(null),[statisticsOpen,setStatisticsOpen]=useState(false);
  const statistics=useProjectStatistics(p.statistics,recording,playing),retakePending=useRef(null),gestureCleanup=useRef(null);
  useEffect(()=>()=>gestureCleanup.current?.(),[]);
  useEffect(()=>{if(!recording&&retakePending.current){const next=retakePending.current;retakePending.current=null;beginRecording(next.target,next.start);}},[recording]);
  function beginSelection(e){if(!(e.ctrlKey||e.metaKey)||recording||busy)return;e.preventDefault();e.stopPropagation();gestureCleanup.current?.();const rect=e.currentTarget.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const update=ev=>{const bx=ev.clientX-rect.left,by=ev.clientY-rect.top,box={start:Math.max(0,Math.min(x,bx)/zoom),end:Math.max(x,bx)/zoom,top:Math.min(y,by),bottom:Math.max(y,by)};setSelectionBox(box);const ids=clipsInRectangle(project.current,rows,box,34+markerHeight);setSelectedClips(ids);setClipId(ids[0]||null);const first=project.current.clips.find(c=>c.id===ids[0]);if(first)setSelected(first.track);};update(e);const finish=()=>{window.removeEventListener('pointermove',update);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);setSelectionBox(null);gestureCleanup.current=null;};gestureCleanup.current=finish;window.addEventListener('pointermove',update);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);}
  const [recordTargets,setRecordTargets]=useState([]),pendingTemplate=useRef('default');
  function selectRecordingTrack(event,id){event?.stopPropagation();if(recording||recordStarting)return;const multi=event?.ctrlKey||event?.metaKey;setRecordTargets(previous=>{const base=previous.length?previous:(p.tracks.some(t=>t.id===selected)?[selected]:[]);return multi?(base.includes(id)?base.filter(x=>x!==id):[...base,id]):[id];});setSelected(id);}
  function additiveSolo(id){const state=project.current,target=channelList(state).find(c=>c.id===id);if(!target)return;commit(changedChannel(state,id,{solo:!target.solo,...!target.solo?{mute:false}:{}}));}
  function deleteMixerChannel(id,confirmed=false){if(recording||recordStarting||busy||id==='master')return;const channel=channelList(project.current).find(c=>c.id===id);if(!channel)return;if(channel.effects?.length&&!confirmed){setEffectToRemove({kind:'mixer',channel:id,name:channel.name});return;}setEffectToRemove(null);commit(removeRoute(project.current,id));setSelected('master');setAutomation(null);setStatus('Mixer channel deleted. Its tracks now target Master.');}
  function chooseTemplate(kind){pendingTemplate.current=kind;setSettings(false);if(p.tracks.length||p.clips.length||p.mixerChannels?.length||dirty)setDialog('new');else newProject();}
  function quickRetake(){if(busy||recordStarting)return;if(recording&&rec.current){retakePending.current={target:rec.current.targets||[rec.current.target],start:rec.current.startAt};rec.current.discard=true;stop();return;}const saved=recordingBuffer.current;if(!saved||!project.current.clips.some(c=>c.id===saved.take.id)||!editableTrack(project.current,saved.take.track)){setStatus('No editable latest take to retake');return;}const targets=(saved.takes||[saved.take]).map(t=>t.track);if(targets.some(id=>!editableTrack(project.current,id))){setStatus('Unlock and unfreeze all take tracks before retaking');return;}const next={...project.current,clips:[...project.current.clips.filter(c=>!targets.includes(c.track)),...saved.before.clips.filter(c=>targets.includes(c.track))]};commit(next);project.current=next;recordingBuffer.current=null;setSelectedClips([]);setClipId(null);setRecordArmed(true);beginRecording(targets,saved.take.start);}

  const [toolsHome, setToolsHome] = useState(false), [aboutOpen, setAboutOpen] = useState(false), [exportScope, setExportScope] = useState("full"), [movingClip, setMovingClip] = useState(null);
  const [mixerWindow, setMixerWindow] = useState(null), [automationMenu, setAutomationMenu] = useState(null), [colorMenu, setColorMenu] = useState(false);
  const popupRef = useRef(null), tempoJob = useRef(0), tempoAbort = useRef(null);
  useEffect(() => () => {
    var _a2, _b2;
    (_a2 = popupRef.current) == null ? void 0 : _a2.close();
    (_b2 = tempoAbort.current) == null ? void 0 : _b2.abort();
  }, []);
  function popoutMixer(mode) {
    var _a2, _b2, _c2;
    setPopoutMenu(false);
    if (mode === "dock") {
      (_a2 = popupRef.current) == null ? void 0 : _a2.close();
      popupRef.current = null;
      setMixerWindow(null);
      setPopupMode(null);
      return;
    }
    if (mode !== "mixer") setCollapsed(false);
    if (mode !== "controls") setMixerOpen(true);
    if (popupRef.current && !popupRef.current.closed) {
      setPopupMode(mode);
      (_c2 = (_b2 = popupRef.current).focus) == null ? void 0 : _c2.call(_b2);
      return;
    }
    const popup = window.open("", "TabrecStudioPanels", "popup=yes,width=1280,height=620");
    if (!popup) {
      setStatus("Allow popups to open the panel window");
      return;
    }
    popupRef.current = popup;
    setPopupMode(mode);
    setMixerWindow(popup);
  }
  function soloMixerChannel(id) {
    var _a2;
    const state = project.current;
    if (id === "master") {
      const enabled = !((_a2 = state.masterChannel) == null ? void 0 : _a2.solo);
      commit({ ...state, masterChannel: { ...state.masterChannel, solo: enabled, mute: false }, tracks: state.tracks.map((t2) => ({ ...t2, solo: false })), mixerChannels:(state.mixerChannels||[]).map(c=>({...c,solo:false})), buses: state.buses.map((t2) => ({ ...t2, solo: false })) });
      return;
    }
    const target = channelList(state).find((t2) => t2.id === id);
    if (!target) return;
    const next = { ...state, masterChannel: { ...state.masterChannel, solo: false }, tracks: state.tracks.map((t2) => t2.id === id && !target.solo ? { ...t2, mute: false } : t2), mixerChannels:(state.mixerChannels||[]).map(c=>c.id===id&&!target.solo?{...c,mute:false}:c), buses: state.buses.map((t2) => t2.id === id && !target.solo ? { ...t2, mute: false } : t2) };
    commit(soloChannel(next, id));
  }
  function automationBase(channel, key) {
    var _a2;
    if (key === "stereoSeparation") return stereoSeparation(channel);
    if (key === "volume") return channel.volume ?? 1;
    if (key === "pan") return channel.pan ?? 0;
    const parts = key.split("."), effect = (_a2 = channel.effects) == null ? void 0 : _a2.find((e) => e.id === parts[1]);
    return (effect == null ? void 0 : effect.params[parts.at(-1)]) ?? defaults()[parts.at(-1)] ?? 0;
  }
  function automationInfo(channel, key) {
    var _a2;
    const parts = key.split("."), fx = parts[0] === "fx" ? (_a2 = channel.effects) == null ? void 0 : _a2.find((e) => e.id === parts[1]) : null, param2 = parts.at(-1), ranges = { ...extraRanges,volume: [0, 1.5], pan: [-1, 1], stereoSeparation: [-100, 100], bass: [-18, 18], mid: [-18, 18], treble: [-18, 18], threshold: [-60, 0], ratio: [1, 20], attack: [1, 100], release: [10, 1e3], gateThreshold: [-80, -5], size: [0.1, 1], decay: [0.2, 6], mix: [0, 100], time: [20, 1500], feedback: [0, 85], delayMix: [0, 100] };
    const [min, max] = ranges[param2] || [0, 1];
    return { channel: channel.id, param: key, min, max, value: automationBase(channel, key), label: (fx ? FX_NAMES[fx.type] + " " : "") + param2.replace(/([A-Z])/g, " $1") };
  }
  function inspectAutomation(value, label) {
    setHelp({ label: label || (automation == null ? void 0 : automation.label) || "BPM", text: Number(value.toFixed(2)) + (label === "Pan" ? " pan" : (label == null ? void 0 : label.toLowerCase().includes("mix")) ? "%" : "") });
  }
  const [resizeEnabled, setResizeEnabled] = useState(() => {
    try {
      return localStorage.getItem("daw-resize-heights") !== "false";
    } catch {
      return true;
    }
  }), [panelHeights, setPanelHeights] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("daw-panel-heights") || "null");
      return saved && typeof saved.tracks === "object" ? saved : defaultHeights();
    } catch {
      return defaultHeights();
    }
  }), resizeCleanup = useRef(null);
  useEffect(() => {
    try {
      localStorage.setItem("daw-resize-heights", String(resizeEnabled));
      localStorage.setItem("daw-panel-heights", JSON.stringify(panelHeights));
    } catch {
    }
  }, [resizeEnabled, panelHeights]);
  useEffect(() => () => {
    var _a2;
    return (_a2 = resizeCleanup.current) == null ? void 0 : _a2.call(resizeCleanup);
  }, []);
  const headerResize=useTrackHeaderResize(recording||!resizeEnabled);
  function resizePanel(e, kind, id) {
    var _a2, _b2;
    if (!resizeEnabled || recording || e.detail >= 2) return;
    e.preventDefault();
    e.stopPropagation();
    const original = panelHeights, y = e.clientY, start2 = kind === "tracks" ? panelHeights.tracks[id] || 80 : kind === "shared" ? Math.max(panelHeights.controls || 292, panelHeights.mixer || 292) : panelHeights[kind] || (kind === "controls" ? 270 : 260), dragWindow = ((_b2 = (_a2 = e.currentTarget) == null ? void 0 : _a2.ownerDocument) == null ? void 0 : _b2.defaultView) || window;
    const move = (ev) => {
      const height = resizedHeight(kind, start2, (kind === "tracks" ? 1 : -1) * (ev.clientY - y), window.innerHeight);
      setPanelHeights((v) => kind === "tracks" ? { ...v, tracks: { ...v.tracks, [id]: height } } : kind === "shared" ? { ...v, controls: height, mixer: height } : { ...v, [kind]: height });
    };
    const cleanup2 = () => {
      dragWindow.removeEventListener("pointermove", move);
      dragWindow.removeEventListener("pointerup", up);
      dragWindow.removeEventListener("pointercancel", cancel);
      resizeCleanup.current = null;
    };
    const up = () => cleanup2(), cancel = () => {
      setPanelHeights(original);
      cleanup2();
    };
    resizeCleanup.current = cleanup2;
    dragWindow.addEventListener("pointermove", move);
    dragWindow.addEventListener("pointerup", up);
    dragWindow.addEventListener("pointercancel", cancel);
  }
  function openAutomationMenu(e, id) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setAutomationMenu({ id, x: Math.min(rect.left, window.innerWidth - 260), y: Math.min(rect.bottom + 4, window.innerHeight - 250) });
  }
  const [popoutMenu, setPopoutMenu] = useState(false), [popupMode, setPopupMode] = useState(null), [dockStack, setDockStack] = useState(false), [dockFlip, setDockFlip] = useState(false), [dockRatio, setDockRatio] = useState(52);
  function resetPanelLayout() {
    var _a2;
    (_a2 = popupRef.current) == null ? void 0 : _a2.close();
    popupRef.current = null;
    setMixerWindow(null);
    setPopupMode(null);
    setResizeEnabled(true);
    headerResize.resetAll();
    setPanelHeights(defaultHeights());
    setDockRatio(52);
    setDockFlip(false);
    setDockStack(false);
    setCollapsed(false);
    setMixerOpen(true);
    setHelpClosed(false);
    setPopoutMenu(false);
  }
  function resetHeight(kind, id) {
    setPanelHeights((v) => kind === "tracks" ? { ...v, tracks: { ...v.tracks, [id]: 80 } } : dockStack && kind !== "shared" ? { ...v, [kind]: null } : { ...v, controls: null, mixer: null });
  }
  function resizeDock(e) {
    var _a2;
    if (!resizeEnabled) return;
    e.preventDefault();
    const rect = e.currentTarget.parentElement.getBoundingClientRect(), original = dockRatio, dragWindow = ((_a2 = e.currentTarget.ownerDocument) == null ? void 0 : _a2.defaultView) || window;
    const move = (ev) => setDockRatio(Math.max(20, Math.min(80, dockFlip ? 100 - (ev.clientX - rect.left) / rect.width * 100 : (ev.clientX - rect.left) / rect.width * 100)));
    const finish = () => {
      dragWindow.removeEventListener("pointermove", move);
      dragWindow.removeEventListener("pointerup", finish);
      dragWindow.removeEventListener("pointercancel", cancel);
    };
    const cancel = () => {
      setDockRatio(original);
      finish();
    };
    dragWindow.addEventListener("pointermove", move);
    dragWindow.addEventListener("pointerup", finish);
    dragWindow.addEventListener("pointercancel", cancel);
  }
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    var _a2;
    if (typeof document === "undefined") return;
    const changed = () => setFullscreen(!!document.fullscreenElement);
    (_a2 = document.addEventListener) == null ? void 0 : _a2.call(document, "fullscreenchange", changed);
    changed();
    return () => {
      var _a3;
      return (_a3 = document.removeEventListener) == null ? void 0 : _a3.call(document, "fullscreenchange", changed);
    };
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else throw Error("Fullscreen is not supported in this browser");
    } catch (e) {
      setStatus(e.message);
    }
  }
  const markerCleanup = useRef(null), suppressMarkerClick = useRef(0), exportCancelled = useRef(false);
  useEffect(() => () => {
    var _a2;
    return (_a2 = markerCleanup.current) == null ? void 0 : _a2.call(markerCleanup);
  }, []);
  const recordAttempt = useRef(null);
  useEffect(() => () => {
    var _a2;
    return (_a2 = recordAttempt.current) == null ? void 0 : _a2.abort();
  }, []);
  const importTarget = useRef(null), afterSave = useRef(null);
  const taps = useRef([]), presetInput = useRef();
  const assets = useRef(/* @__PURE__ */ new Map()), ctx = useRef(), runtime = useRef(), rec = useRef(), position = useRef(0), playingRef = useRef(false), project = useRef(p), handle = useRef(), saveFolder = useRef(null), importInput = useRef(), openInput = useRef(), timeline = useRef(), monitorRef = useRef(false), metroRef = useRef(false);
  project.current = p;
  monitorRef.current = monitor;
  metroRef.current = metro;
  const channels = useMemo(()=>[masterChannel(p), ...channelList(p)],[p]), mixerVisible=useMemo(()=>[channels[0],...independentMixers(p)],[channels,p]), track = channels.find((t2) => t2.id === selected) || p.tracks[0] || channels[0], fxTrack=p.tracks.some(t=>t.id===track.id)?(channels.find(c=>c.id===(track.mixerTarget||'master'))||channels[0]):track, clip = p.clips.find((c) => c.id === clipId), end = Math.max(300, recording ? cursor : 0, ...p.clips.map((c) => c.start + c.duration), ...(p.markers || []).map((m) => m.time + 60), ...(p.tempoAutomation || []).map((point) => point.time),...Object.values(p.masterChannel?.automation||{}).flat().map(point=>point.time)), width = Math.max(1100, timelineView.width || 0, (end + 30) * zoom);
  const mixerOptions=useMemo(()=>routingChoices(p,mixerVisible),[p,mixerVisible]),mixerActions=useRef(null);mixerActions.current={setSelected,setCollapsed,changeTrack,soloMixerChannel,deleteMixerChannel,deleteBus};
  const visibleMeters=useVisibleMeterChannels({count:channels.map(c=>c.id).join(','),popup:mixerWindow,mixerOpen,collapsed,mobile});
  const rows = useMemo(()=>layoutRows(p, panelHeights.tracks).map(row=>mobile?{...row,height:row.kind==='track'?60:Math.min(row.height,56)}:row),[p,panelHeights.tracks,mobile]), markerHeight = ((_a = p.markers) == null ? void 0 : _a.length) ? 24 : 0, timelineHeight = 34 + markerHeight + rows.reduce((sum, row) => sum + row.height, 0);
  useEffect(() => {
    const el = timeline.current;
    if (!el) return;
    const measure = () => setTimelineView((v) => {
      const next = { left: el.scrollLeft || 0, width: el.clientWidth || 0 };
      return next.left === v.left && next.width === v.width ? v : next;
    });
    const wheel=e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const old=zoomRef.current,next=Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,old*Math.exp(-e.deltaY*.002))),x=Math.max(0,e.clientX-(el.getBoundingClientRect?.().left||0)),time=(el.scrollLeft+x)/old;setZoom(next);requestAnimationFrame(()=>{el.scrollLeft=Math.max(0,time*next-x);});};const wheelTarget=el.parentElement||el;wheelTarget.addEventListener?.('wheel',wheel,{passive:false});
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer == null ? void 0 : observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      wheelTarget.removeEventListener?.('wheel',wheel);observer == null ? void 0 : observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  useEffect(() => setAddFx(false), [selected]);
  const grid = (t2) => snapProjectTime(p, t2);
  useEffect(() => {
    setPitch((clip == null ? void 0 : clip.pitch) || 0);
  }, [clipId, clip == null ? void 0 : clip.pitch]);
  function newTrack(n, existing = []) {
    return { ...makeTrack(n, existing), collapsed: false };
  }
  function controlValue(channel, param2, fallback) {
    var _a2, _b2;
    return playing && ((_b2 = (_a2 = channel.automation) == null ? void 0 : _a2[param2]) == null ? void 0 : _b2.length) ? valueAt(channel.automation[param2], cursor, fallback) : fallback;
  }
  function commit(next) {
    const original = project.current;
    if (next.clips.length && (next.stretchMode !== original.stretchMode || next.bpm !== original.bpm || JSON.stringify(next.tempoAutomation) !== JSON.stringify(original.tempoAutomation))) {
      changeTempo(original, next);
      return;
    }
    setHistory((h) => ({ undo: [...h.undo.slice(-39), original], redo: [] }));
    setP(next);
    setDirty(true);
  }
  async function changeTempo(original, next) {
    var _a2;
    const job = ++tempoJob.current;
    (_a2 = tempoAbort.current) == null ? void 0 : _a2.abort();
    const controller = new AbortController();
    tempoAbort.current = controller;
    setBusy(true);
    pause();
    try {
      const c = await audio(), clips = [];
      for (const cl of next.clips) {
        const previous = original.clips.find((x) => x.id === cl.id) || cl, bounds = tempoClipBounds(previous, original, next), source = previous.tempoSource || { asset: previous.asset, offset: previous.offset, duration: previous.duration, start: previous.start, tempo: { bpm: original.bpm, tempoAutomation: original.tempoAutomation || [] } }, asset = assets.current.get(source.asset), sr = asset.buffer.sampleRate, first = Math.round(source.offset * sr), last = Math.round((source.offset + source.duration) * sr), data = Array.from({ length: asset.buffer.numberOfChannels }, (_, ch) => asset.buffer.getChannelData(ch).slice(first, last)), result = await runCleanupWorker(data, sr, "tempo", { before: source.tempo, after: { bpm: next.bpm, tempoAutomation: next.tempoAutomation || [] }, sourceStart: source.start, sourceDuration: source.duration, ...bounds, mode: next.stretchMode || "resample" }, controller.signal);
        if (job !== tempoJob.current) return;
        const buffer = c.createBuffer(result.channels.length, result.channels[0].length, sr);
        result.channels.forEach((x, i) => buffer.getChannelData(i).set(x));
        const id = crypto.randomUUID();
        assets.current.set(id, { id, name: cl.name + " tempo.wav", bytes: floatWav(buffer), buffer });
        const ratio = bounds.duration / previous.duration;
        clips.push({ ...cl, ...bounds, asset: id, offset: 0, duration: buffer.duration, fadeIn: (cl.fadeIn || 0) * ratio, fadeOut: (cl.fadeOut || 0) * ratio, tempoSource: source, pitchSource: void 0, stretchSource: void 0 });
      }
      if (job !== tempoJob.current) return;
      setHistory((h) => ({ undo: [...h.undo.slice(-39), original], redo: [] }));
      setP({ ...next, clips });
      setDirty(true);
      setRevision((x) => x + 1);
      setStatus("Audio follows project BPM · " + (next.stretchMode || "resample"));
    } catch (e) {
      if (e.name !== "AbortError") setStatus("Tempo change failed: " + e.message);
    } finally {
      if (job === tempoJob.current) setBusy(false);
    }
  }
  async function audio() {
    if (!ctx.current) {
      const c = new AudioContext({ latencyHint: "interactive" });
      await initGate(c);
      ctx.current = c;
    }
    await ctx.current.resume();
    return ctx.current;
  }
  function cleanup() {
    var _a2;
    if (runtime.current) {
      runtime.current.sources.forEach((s) => {
        try {
          s.stop();
        } catch {
        }
      });
      runtime.current.graphs.forEach((g) => g.dispose());
      runtime.current.master.disconnect();
      (_a2 = runtime.current.splitter) == null ? void 0 : _a2.disconnect();
      runtime.current.analyzers.forEach((a) => a.disconnect());
      runtime.current = null;
    }
    playingRef.current = false;
    setPlaying(false);
  }
  function seek(t2) {
    const was = playingRef.current;
    if (recording) return;
    cleanup();
    position.current = Math.max(0, t2);
    setCursor(position.current);
    if (was) start(position.current);
  }
  async function start(from = position.current, forRecording = false) {
    try {
      const c = await audio();
      cleanup();
      const state = project.current, loop = state.loop, looping = (loop == null ? void 0 : loop.enabled) && !forRecording && loop.end > loop.start + 0.05;
      if (looping && (from >= loop.end || from < loop.start)) from = loop.start;
      const now = c.currentTime + 0.035, mix = buildMix(c, state, c.destination,{activeTracks:state.clips.map(clip=>clip.track)}), master = mix.master.input, splitter = c.createChannelSplitter(2), analyzers = [c.createAnalyser(), c.createAnalyser()];
      analyzers.forEach((a) => a.fftSize = 256);
      mix.master.meter.connect(splitter);
      splitter.connect(analyzers[0], 0);
      splitter.connect(analyzers[1], 1);
      attachStereoMeters(c, mix);
      const { map, graphs } = mix, sources = [], audibleClips = resolveClipPriority(state.clips);
      const schedule = (begin, until, when) => {
        var _a2;
        scheduleAutomation(state, mix, begin, until, when);
        for (const cl of audibleClips) {
          const a = assets.current.get(cl.asset), g = map[cl.track], lo = Math.max(begin, cl.start), hi = Math.min(until, cl.start + cl.duration);
          if (!a || !g || hi <= lo || forRecording && (rec.current?.targets||[rec.current?.target]).includes(cl.track)) continue;
          const source = scheduleClip(c, cl, a.buffer, g.source || g.input, begin, until, when);
          if (source) {
            sources.push(source);
            const done = source.onended;
            source.onended = () => {
              done == null ? void 0 : done();
              const i = sources.indexOf(source);
              if (i >= 0) sources.splice(i, 1);
            };
          }
        }
      };
      schedule(from, looping ? loop.end : Infinity, now);
      runtime.current = { master, graphs, map, sources, analyzers, splitter, now, from, forRecording, looping, loop, schedule, nextLoop: looping ? now + loop.end - from : Infinity, metroBeat: Math.ceil(beatPosition(state, from) - 1e-7), metroBase: now - from };
      applyEqAudition(runtime.current,eqAuditionRef.current);
      playingRef.current = true;
      setPlaying(true);
    } catch (e) {
      setStatus("Playback failed: " + e.message);
      if (forRecording) throw e;
    }
  }
  function stop() {
    var _a2;
    (_a2 = recordAttempt.current) == null ? void 0 : _a2.abort();
    if (rec.current) {
      rec.current.stopRequested = true;
      rec.current.node.port.postMessage("stop");
    }
    cleanup();
    position.current = 0;
    setCursor(0);
  }
  function pause() {
    if (recording) {
      stop();
      return;
    }
    cleanup();
  }
  useEffect(() => {
    let id;
    function frame() {
      const r = runtime.current;
      if (r) {
        let t2 = Math.max(r.from, r.from + ctx.current.currentTime - r.now);
        if (r.looping) {
          while (r.nextLoop < ctx.current.currentTime + 0.15) {
            r.schedule(r.loop.start, r.loop.end, r.nextLoop);
            r.nextLoop += r.loop.end - r.loop.start;
          }
          if (t2 >= r.loop.end) t2 = r.loop.start + (t2 - r.loop.end) % (r.loop.end - r.loop.start);
        }
        position.current = t2;
        const refreshDisplay=!r.lastDisplay||ctx.current.currentTime-r.lastDisplay>=1/30;
        if(refreshDisplay){r.lastDisplay=ctx.current.currentTime;setCursor(t2);}
        if (autoScrollRef.current && timeline.current) {
          const el = timeline.current, pixel = t2 * zoomRef.current;
          if (el.clientWidth && (pixel > el.scrollLeft + el.clientWidth * 0.8 || pixel < el.scrollLeft)) el.scrollLeft = Math.max(0, pixel - el.clientWidth * 0.2);
        }
        if(refreshDisplay){
        const values = {};
        const peak = (a) => {
          const d = a._meterSamples || (a._meterSamples = new Float32Array(a.fftSize));
          a.getFloatTimeDomainData(d);
          let value=0;for(let i=0;i<d.length;i++)value=Math.max(value,Math.abs(d[i]));return value;
        };
        for (const [k, g] of Object.entries(r.map)) {
          if(k!=='master'&&visibleMeters.current&&!visibleMeters.current.has(k))continue;
          const [left, right] = readStereoMeters(g);
          values[k] = Math.max(left, right);
          values[k + ".left"] = left;
          values[k + ".right"] = right;
        }
        setMeters(previous=>Object.keys(previous).length===Object.keys(values).length&&Object.keys(values).every(key=>Math.abs((previous[key]||0)-values[key])<.002)?previous:values);
        const peaks = r.analyzers.map(peak);
        setMasterPeaks(previous=>peaks.every((v,i)=>Math.abs(v-previous[i])<.002)?previous:peaks);
        if (peaks.some((x) => x >= 0.999)) setClipped(true);
        }
        if (metroRef.current) {
          for (let guard = 0; guard < 128; guard++) {
            let beat = beatTime(project.current, r.metroBeat);
            if (r.looping && beat >= r.loop.end - 1e-7) {
              r.metroBase += r.loop.end - r.loop.start;
              r.metroBeat = Math.ceil(beatPosition(project.current, r.loop.start) - 1e-7);
              if (r.metroBase + r.loop.start > ctx.current.currentTime + 0.12) break;
              continue;
            }
            const when = r.metroBase + beat;
            if (when > ctx.current.currentTime + 0.12) break;
            if (when >= ctx.current.currentTime - 2e-3) {
              const o = ctx.current.createOscillator(), g = ctx.current.createGain();
              o.frequency.value = r.metroBeat % Number((project.current.signature || "4/4").split("/")[0]) === 0 ? 1200 : 800;
              g.gain.setValueAtTime(0.12, Math.max(when, ctx.current.currentTime));
              g.gain.exponentialRampToValueAtTime(1e-3, Math.max(when, ctx.current.currentTime) + 0.04);
              o.connect(g).connect(r.master);
              o.onended=()=>{o.disconnect();g.disconnect();};
              o.start(Math.max(when, ctx.current.currentTime));
              o.stop(Math.max(when, ctx.current.currentTime) + 0.05);
            }
            r.metroBeat++;
          }
        } else {
          const cycles = r.looping ? Math.max(0, Math.floor((r.from + ctx.current.currentTime - r.now - r.loop.start) / (r.loop.end - r.loop.start))) : 0;
          r.metroBase = r.now - r.from + cycles * (r.looping ? r.loop.end - r.loop.start : 0);
          r.metroBeat = Math.ceil(beatPosition(project.current, t2) - 1e-7);
        }
        if (!r.forRecording && !r.looping && t2 > Math.max(1, ...project.current.clips.map((c) => c.start + c.duration)) + 5) {
          cleanup();
        }
      }
      id = requestAnimationFrame(frame);
    }
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    const r = runtime.current;
    if (!r) return;
    updateMix(ctx.current, p, r);
  }, [p]);
  useEffect(() => {
    if (playingRef.current && !recording) start(position.current);
  }, [JSON.stringify([channels.map((t2) => [t2.id, t2.effects.map(e=>[e.id,e.type,e.enabled,e.type==='delay'?e.params.delayStyle:e.type==='reverb'?e.params.reverbStyle:null,...(e.type==='reverb'&&!['size','decay'].some(key=>t2.automation?.['fx.'+e.id+'.'+key]?.length)?[e.params.size,e.params.decay]:[])]), t2.bypass, t2.swapChannels, t2.invertPolarity, t2.output, t2.outputs, t2.outputMaster, t2.mixerTarget, t2.automation, t2.mute, t2.solo]), p.clips, p.effectsBypass, p.loop, p.bpm, p.signature, p.key, p.scale, p.tempoAutomation])]);
  useEffect(() => {
    const fn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);
  useEffect(() => {
    const fn = (e) => {
      var _a2;
      return (_a2 = shortcutHandler.current) == null ? void 0 : _a2.call(shortcutHandler, e);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  async function importFiles(files, target = null, at = position.current) {
    if(target&&!editableTrack(project.current,target)){setStatus('Unlock and unfreeze this track before importing');return;}
    var _a2;
    if (!files.length) return;
    setBusy(true);
    try {
      const c = await audio();
      let next = project.current, idx = next.tracks.length, importAt = at;
      for (const file of files) {
        if (!target && idx >= MAX_TRACKS) {
          setStatus("Maximum 128 tracks");
          break;
        }
        const bytes = await file.arrayBuffer(), buffer = await c.decodeAudioData(bytes.slice(0));
        const id = crypto.randomUUID();
        assets.current.set(id, { id, name: file.name, bytes, buffer });
        if (!target && idx >= MAX_TRACKS) break;
        if (!target && idx >= next.tracks.length) next = { ...next, tracks: [...next.tracks, newTrack(idx + 1, next.tracks)] };
        next = { ...next, clips: [...next.clips, { id: crypto.randomUUID(), asset: id, track: target || next.tracks[idx].id, name: file.name.replace(/\.[^.]+$/, ""), start: grid(importAt), offset: 0, duration: buffer.duration, fadeIn: 0, fadeOut: 0 }] };
        idx++;
        if (target) importAt += buffer.duration;
      }
      let mobileVocal=null;
      if(mobile&&!target&&next.tracks.length<MAX_TRACKS){const voice={...newTrack(next.tracks.length+1,next.tracks),name:'Lead'};next={...next,tracks:[...next.tracks,voice]};mobileVocal=voice.id;}
      commit(next);
      setSelected(mobileVocal || target || ((_a2 = next.tracks.at(-1)) == null ? void 0 : _a2.id) || null);
      setRevision((x) => x + 1);
      setStatus("Audio imported · saved with your project");
    } catch (e) {
      setStatus("Could not import audio: " + e.message);
    } finally {
      setBusy(false);
    }
  }
  function toggleRecord() {
    var _a2;
    if (recordAttempt.current) {
      recordAttempt.current.abort();
      setRecordArmed(false);
      return;
    }
    if (recording) {
      setRecordArmed(false);
      (_a2 = rec.current) == null ? void 0 : _a2.node.port.postMessage("stop");
      return;
    }
    setRecordArmed((v) => !v);
    setStatus(recordArmed ? "Recording disarmed" : "Recording armed — press Play to start");
  }
  function playTransport() {
    if (playingRef.current) {
      pause();
      return;
    }
    return recordArmed ? beginRecording() : start();
  }
  async function beginRecording(targetOverride=null,startOverride=null) {
    var _a2, _b2, _c2, _d2;
    if (recordAttempt.current || recording || busy) return;
    const requestedTargets=Array.isArray(targetOverride)?targetOverride:targetOverride?[targetOverride]:recordTargets.length?recordTargets:[selected];
    if (project.current.tracks.some(t=>requestedTargets.includes(t.id)&&(t.frozen||t.locked))) {
      setStatus("Unlock and unfreeze the selected track before recording");
      return;
    }
    if(startOverride!==null){position.current=startOverride;setCursor(startOverride);}
    const attempt = new AbortController();
    recordAttempt.current = attempt;
    setRecordStarting(true);
    let stream, input, node, silent, monitorGain, live = false;
    try {
      const c = await audio();
      stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: device ? { exact: device } : void 0, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (attempt.signal.aborted) throw Object.assign(Error("Cancelled"), { name: "AbortError" });
      setDevices((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput"));
      if (countIn) {
        cleanup();
        await runCountIn(c, { bpm: tempoAt(project.current, position.current), signal: attempt.signal, onTick: setCountdown });
      }
      await c.audioWorklet.addModule(new URL("./recorder.js", import.meta.url));
      if (attempt.signal.aborted) throw Object.assign(Error("Cancelled"), { name: "AbortError" });
      let target = ((_b2 = project.current.tracks.find((t2) => t2.id === requestedTargets[0] && !t2.frozen && !t2.locked)) == null ? void 0 : _b2.id) || ((_c2 = project.current.tracks.find((t2) => !t2.frozen&&!t2.locked)) == null ? void 0 : _c2.id);
      if (!target) {
        if (project.current.tracks.length >= MAX_TRACKS) throw Error("Maximum 128 tracks. Unfreeze or remove a track before recording");
        const created = newTrack(project.current.tracks.length + 1, project.current.tracks), next = { ...project.current, tracks: [...project.current.tracks, created] };
        commit(next);
        project.current = next;
        target = created.id;
        setSelected(target);
      }
      input = c.createMediaStreamSource(stream);
      node = new AudioWorkletNode(c, "local-recorder", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
      silent = c.createGain();
      monitorGain = c.createGain();
      silent.gain.value = 0;
      monitorGain.gain.value = monitorRef.current ? 1 : 0;
      input.connect(node).connect(silent).connect(c.destination);
      input.connect(monitorGain).connect(c.destination);
      const analyser=c.createAnalyser();input.connect(analyser);
      const startAt = position.current, chunks = [[], []];
      let frames = 0, finished = false;
      const targets=[...new Set([target,...requestedTargets.filter(id=>project.current.tracks.some(t=>t.id===id&&!t.frozen&&!t.locked))])];
      rec.current = { node, stream, monitorGain, target, targets, startAt, analyser, discard:false };
      setSelected(target);
      node.port.onmessage = (e) => {
        if (e.data.done) {
          if (finished) return;
          finished = true;
          const discard=rec.current?.discard;analyser.disconnect();
          input.disconnect();
          node.disconnect();
          silent.disconnect();
          monitorGain.disconnect();
          stream.getTracks().forEach((t2) => t2.stop());
          rec.current = null;
          setRecording(false);
          cleanup();
          position.current = startAt;
          setCursor(startAt);
          if (frames&&!discard) {
            statistics.recorded();
            const buffer = c.createBuffer(2, frames, c.sampleRate);
            for (let ch = 0; ch < 2; ch++) {
              let at = 0;
              for (const part of chunks[ch]) {
                buffer.getChannelData(ch).set(part, at);
                at += part.length;
              }
            }
            const id = crypto.randomUUID(), offset = Math.min(Math.max(0, (c.baseLatency || 0) + (c.outputLatency || 0) + Number(latency) / 1e3), buffer.duration * 0.5);
            assets.current.set(id, { id, name: "Recording.wav", bytes: floatWav(buffer), buffer });
            const take = { id: crypto.randomUUID(), asset: id, track: target, name: "Vocal recording", start: startAt, offset, duration: buffer.duration - offset, gainDb: 0, fadeIn: 0, fadeOut: 0 };
            const takes=targets.filter(id=>project.current.tracks.some(t=>t.id===id)).map(id=>({...take,id:id===target?take.id:crypto.randomUUID(),track:id}));
            recordingBuffer.current = { before: project.current, take, takes };
            commit({ ...project.current, clips: takes.reduce((clips,t)=>replaceRecording(clips,t),project.current.clips) });
            setClipId(take.id);
            setRevision((n) => n + 1);
            setStatus("Recording captured. Undo restores the previous audio.");
          }
          return;
        }
        if (!finished && e.data.channels) {
          for (let ch = 0; ch < 2; ch++) chunks[ch].push(e.data.channels[ch]);
          frames += e.data.channels[0].length;
        }
      };
      await start(startAt, true);
      if (!runtime.current) throw Error("Could not start recording playback");
      if (attempt.signal.aborted) throw Object.assign(Error("Cancelled"), { name: "AbortError" });
      node.port.postMessage({ startFrame: Math.ceil(runtime.current.now * c.sampleRate) });
      live = true;
      setRecording(true);
      setStatus("Recording locally — Stop finishes the take");
    } catch (e) {
      setStatus(e.name === "AbortError" ? "Recording cancelled" : (stream ? "Recording playback failed: " : "Microphone unavailable: ") + e.message);
    } finally {
      if (!live) {
        input == null ? void 0 : input.disconnect();
        node == null ? void 0 : node.disconnect();
        silent == null ? void 0 : silent.disconnect();
        monitorGain == null ? void 0 : monitorGain.disconnect();
        stream == null ? void 0 : stream.getTracks().forEach((t2) => t2.stop());
        if (((_d2 = rec.current) == null ? void 0 : _d2.node) === node) rec.current = null;
        cleanup();
      }
      if (recordAttempt.current === attempt) recordAttempt.current = null;
      setRecordStarting(false);
      setCountdown(0);
    }
  }
  useEffect(() => {
    if (rec.current) rec.current.monitorGain.gain.value = monitor ? 1 : 0;
  }, [monitor]);
  async function save(as = false, newName = p.name, saveMeta = {}, folder = saveFolder.current, downloadsOnly=false) {
    if (recording) return;
    setBusy(true);
    try {
      const pickedFile=!downloadsOnly&&!folder&&window.showSaveFilePicker?await window.showSaveFilePicker({id:'tabrec-project',suggestedName:newName+'.trstudio',...(handle.current?{startIn:handle.current}:{}),types:[{description:'Tabrec Studio project',accept:{'application/json':['.trstudio']}}]}):null;
      const referenced = [...p.clips, ...p.tracks.flatMap((t2) => {
        var _a2;
        return ((_a2 = t2.frozenBackup) == null ? void 0 : _a2.clips) || [];
      })], used = new Set(referenced.flatMap((c) => {
        var _a2, _b2, _c2;
        return [c.asset, (_a2 = c.pitchSource) == null ? void 0 : _a2.asset, (_b2 = c.stretchSource) == null ? void 0 : _b2.asset, (_c2 = c.tempoSource) == null ? void 0 : _c2.asset].filter(Boolean);
      })), embedded = [];
      for (const id of used) {
        const a = assets.current.get(id), bytes = new Uint8Array(a.bytes);
        let s = "";
        for (let n = 0; n < bytes.length; n += 32768) s += String.fromCharCode(...bytes.subarray(n, n + 32768));
        embedded.push({ id, name: a.name, data: btoa(s) });
      }
      const stat=statistics.snapshot(),savedStatistics={...stat,saves:stat.saves+1,copies:stat.copies+(p.lastSaved&&as?1:0)};
      const blob = new Blob([JSON.stringify({ ...p, ...saveMeta, statistics:savedStatistics, name: newName, notes, lastSaved: Date.now(), format: "bdaw", version: 1, assets: embedded })], { type: "application/json" });
      if(!downloadsOnly&&folder){const file=await folder.getFileHandle(newName+'.trstudio',{create:true});await writeProjectFile(file,blob);saveFolder.current=folder;handle.current=file;}
      else if(pickedFile){await writeProjectFile(pickedFile,blob);handle.current=pickedFile;} else download(blob,newName+'.trstudio');
      setDirty(false);
      statistics.saved(savedStatistics);
      setP((v) => ({ ...v, ...saveMeta, statistics:savedStatistics, name: newName, lastSaved: Date.now() }));
      setSaveClock(Date.now());
      setStatus("Complete project saved to your device");
      return true;
    } catch (e) {
      if (e.name !== "AbortError") setStatus("Save failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3e4);
  }
  async function open(file, fileHandle = null) {
    var _a2;
    if (!file) return;
    if (dirty && !confirm("Discard unsaved changes and open this project?")) return;
    setBusy(true);
    try {
      const data = validateProject(JSON.parse(await file.text())), c = await audio(), map = /* @__PURE__ */ new Map();
      for (const a of data.assets) {
        const bytes = Uint8Array.from(atob(a.data), (x) => x.charCodeAt(0)).buffer, buffer = await c.decodeAudioData(bytes.slice(0));
        map.set(a.id, { id: a.id, name: a.name, bytes, buffer });
      }
      for (const cl of [...data.clips, ...data.tracks.flatMap((t2) => {
        var _a3;
        return ((_a3 = t2.frozenBackup) == null ? void 0 : _a3.clips) || [];
      })]) {
        if (cl.offset + cl.duration > map.get(cl.asset).buffer.duration + 0.05) throw Error("Clip extends beyond its audio.");
        if (cl.tempoSource && cl.tempoSource.offset + cl.tempoSource.duration > map.get(cl.tempoSource.asset).buffer.duration + 0.05) throw Error("Tempo source extends beyond its audio.");
        if (cl.stretchSource && cl.stretchSource.offset + cl.stretchSource.duration > map.get(cl.stretchSource.asset).buffer.duration + 0.05) throw Error("Stretch source extends beyond its audio.");
        if (cl.pitchSource && cl.pitchSource.offset + cl.pitchSource.duration > map.get(cl.pitchSource.asset).buffer.duration + 0.05) throw Error("Render source extends beyond its audio.");
      }
      stop();
      setRecordArmed(false);
      recordingBuffer.current = null;setRecordTargets([]);
      setSelectedClips([]);statistics.reset(data.statistics||{...newStatistics(),createdAt:null});
      assets.current = map;
      setNotes(typeof data.notes === "string" ? data.notes : "");
      setP(migrateMixerProject({ ...initial(), ...data, gridDivision:data.gridDivision??16, effectsBypass: false, editOptions: { ...initial().editOptions, ...data.editOptions }, buses: (data.buses || []).map((t2) => ({ ...migrate(t2), kind: "bus", ...data.effectsBypass ? { bypass: true } : {} })), masterChannel: { ...initial().masterChannel, ...data.masterChannel, ...data.effectsBypass ? { bypass: true } : {} }, mixerChannels:data.mixerChannels?.map(migrate), tracks: data.tracks.map((t2) => ({ ...migrate(t2), ...data.effectsBypass ? { bypass: true } : {} })) }));
      setSelected(((_a2 = data.tracks[0]) == null ? void 0 : _a2.id) || "master");
      setSaveClock(Date.now());
      setClipId(null);
      setHistory({ undo: [], redo: [] });
      handle.current = null;saveFolder.current=null;
      setDirty(false);
      setRevision((x) => x + 1);
      handle.current = fileHandle;
      setStatus("Project restored · all audio stays on your device");
    } catch (e) {
      setStatus("Could not open project: " + e.message);
    } finally {
      setBusy(false);
    }
  }
  function edit(action) {
    var _a2, _b2;
    if (!clip || recording || !editableTrack(p,clip.track)) return;
    if (action === "delete") {
      const ids=selectionIds(p,selectedClips,clip.id);commit({...p,clips:p.clips.filter(c=>!ids.includes(c.id))});setClipId(null);setSelectedClips([]);
    }
    if (action === "duplicate") {
      if (p.tracks.length >= MAX_TRACKS) {
        setStatus("Maximum 128 tracks");
        return;
      }
      const source = p.tracks.find((t2) => t2.id === clip.track), copy = { ...structuredClone(source), id: crypto.randomUUID(), name: source.name + " - Copy", collapsed: source.collapsed, color: newTrack(p.tracks.length + 1, p.tracks).color, frozen: false, frozenBackup: void 0 }, index = p.tracks.indexOf(source), tracks = [...p.tracks];
      tracks.splice(index + 1, 0, copy);
      const duplicate = { ...clip, id: crypto.randomUUID(), track: copy.id };
      commit({ ...p, tracks, clips: [...p.clips, duplicate] });
      setSelected(copy.id);
      setClipId(duplicate.id);
    }
    if (action === "split") {
      let at = grid(cursor) - clip.start;
      if (((_b2 = p.editOptions) == null ? void 0 : _b2.zeroCrossing) !== false) at = nearestZeroCrossing(assets.current.get(clip.asset).buffer, clip.offset + at) - clip.offset;
      if (at <= 0.01 || at >= clip.duration - 0.01) {
        setStatus("Move the playhead inside the selected clip to split");
        return;
      }
      const base = { ...clip, tempoSource: void 0, pitchSource: void 0, stretchSource: void 0, pitch: 0, reversed: false };
      commit({ ...p, clips: p.clips.flatMap((c) => c.id === clip.id ? [{ ...base, duration: at, fadeIn: Math.min(c.fadeIn || 0, at), fadeOut: 0 }, { ...base, id: crypto.randomUUID(), start: c.start + at, offset: c.offset + at, duration: c.duration - at, fadeIn: 0, fadeOut: Math.min(c.fadeOut || 0, c.duration - at) }] : [c]) });
    }
  }
  function drag(e, cl, mode) {
    var _a2, _b2;
    if (recording || busy || !editableTrack(p,cl.track)) return;
    if(e.ctrlKey||e.metaKey)return;e.stopPropagation();const ids=selectionIds(p,selectedClips,cl.id);setSelectedClips(ids);
    if (["move", "left", "right"].includes(mode)) setMovingClip(cl.id);
    setAutomation(null);
    setClipId(cl.id);
    setSelected(cl.track);
    const stretching = ((_b2 = p.editOptions) == null ? void 0 : _b2.stretch) && ["left", "right"].includes(mode);
    if (stretching) pause();
    const x = e.clientX, y = e.clientY, original = project.current, owner = original.tracks.find((t2) => t2.id === cl.track), moveGroup2 = false, groupTracks = [cl.track];
    if (mode === "move" && moveGroup2 && original.tracks.some((t2) => t2.group === owner.group && t2.frozen)) {
      setStatus("Unfreeze group members before moving their audio");
      return;
    }
    let next = original;
    const move = (ev) => {
      var _a3, _b3, _c2;
      const raw = (ev.clientX - x) / zoom;
      let altered = { ...cl };
      if (mode === "move") {
        const laneRows = layoutRows(original, panelHeights.tracks).filter((r) => r.kind === "track"), current = laneRows.findIndex((r) => r.track.id === cl.track), targetIndex = Math.max(0, Math.min(laneRows.length - 1, current + Math.round((ev.clientY - y) / (owner.collapsed ? 40 : panelHeights.tracks[owner.id] || 96))));
        const targetId=e.shiftKey?cl.track:laneRows[targetIndex]?.track.id;const delta=original.tracks.findIndex(t=>t.id===targetId)-original.tracks.findIndex(t=>t.id===cl.track);next=moveSelection(original,ids,grid(cl.start+raw)-cl.start,delta);
      } else {
        if (stretching) {
          if (mode === "left") {
            const d = Math.max(-cl.start, Math.min(cl.duration - 0.05, grid(cl.start + raw) - cl.start));
            altered.start = cl.start + d;
            altered.duration = cl.duration - d;
          } else altered.duration = Math.max(0.05, grid(cl.start + cl.duration + raw) - cl.start);
          altered.previewDuration = cl.duration;
        } else {
          const buffer = assets.current.get(cl.asset).buffer;
          if (mode === "left") {
            let desired = cl.offset + grid(cl.start + raw) - cl.start;
            if (((_b3 = p.editOptions) == null ? void 0 : _b3.zeroCrossing) !== false) desired = nearestZeroCrossing(buffer, desired);
            const d = Math.max(-cl.offset, Math.min(cl.duration - 5e-3, Math.max(-cl.start, desired - cl.offset)));
            altered.start += d;
            altered.offset += d;
            altered.duration -= d;
          }
          if (mode === "right") {
            let desired = cl.offset + grid(cl.start + cl.duration + raw) - cl.start;
            if (((_c2 = p.editOptions) == null ? void 0 : _c2.zeroCrossing) !== false) desired = nearestZeroCrossing(buffer, desired);
            altered.duration = Math.max(5e-3, Math.min(buffer.duration - cl.offset, desired - cl.offset));
          }
          altered.tempoSource = void 0;
          altered.pitchSource = void 0;
          altered.stretchSource = void 0;
          altered.pitch = 0;
          altered.reversed = false;
        }
        if (mode === "fadeIn") altered.fadeIn = Math.max(0, Math.min(cl.duration - (cl.fadeOut || 0), (cl.fadeIn || 0) + raw));
        if (mode === "fadeOut") altered.fadeOut = Math.max(0, Math.min(cl.duration - (cl.fadeIn || 0), (cl.fadeOut || 0) - raw));
        altered.fadeIn = Math.min(altered.fadeIn || 0, altered.duration);
        altered.fadeOut = Math.min(altered.fadeOut || 0, altered.duration);
        next=['fadeIn','fadeOut'].includes(mode)?adjustSelection(original,ids,mode,mode==='fadeOut'?-raw:raw):{...original,clips:original.clips.map(c=>c.id===cl.id?altered:c)};
      }
      setP(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel",cancel);gestureCleanup.current=null;setMovingClip(null);
      if (next !== original) {
        if (stretching) {
          renderStretch(original, cl, next.clips.find((c) => c.id === cl.id));
        } else {
          if (["move", "left", "right"].includes(mode)) {
            next = { ...next, clips: resolveClipPriority(next.clips, ids, cl.id) };
            setP(next);
          }
          setHistory((h) => ({ undo: [...h.undo.slice(-39), original], redo: [] }));
          setDirty(true);
        }
      }
    };
    const cancel=()=>{next=original;setP(original);up();};gestureCleanup.current=cancel;window.addEventListener("pointercancel",cancel);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  async function renderStretch(original, cl, altered) {
    setBusy(true);
    try {
      const source = cl.stretchSource || { asset: cl.asset, offset: cl.offset, duration: cl.duration }, asset = assets.current.get(source.asset), sr = asset.buffer.sampleRate, first = Math.round(source.offset * sr), last = Math.round((source.offset + source.duration) * sr), channels2 = Array.from({ length: asset.buffer.numberOfChannels }, (_, c) => asset.buffer.getChannelData(c).slice(first, last));
      const result = await runCleanupWorker(channels2, sr, "stretch", { duration: altered.duration }), buffer = (await audio()).createBuffer(result.channels.length, result.channels[0].length, sr);
      result.channels.forEach((data, c) => buffer.getChannelData(c).set(data));
      const id = crypto.randomUUID();
      assets.current.set(id, { id, name: cl.name + " stretched.wav", bytes: floatWav(buffer), buffer });
      const rendered = { ...altered, asset: id, offset: 0, duration: buffer.duration, stretchSource: source, tempoSource: void 0, previewDuration: void 0, pitchSource: void 0, pitch: 0, reversed: false };
      setP((v) => ({ ...v, clips: resolveClipPriority(v.clips.map((c) => c.id === cl.id ? rendered : c), [cl.id], cl.id) }));
      setHistory((h) => ({ undo: [...h.undo.slice(-39), original], redo: [] }));
      setDirty(true);
      setRevision((n) => n + 1);
      setStatus("Clip stretched — original audio retained for undo");
    } catch (e) {
      setP(original);
      setStatus("Stretch failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }
  function beginTempoAutomation() {
    var _a2;
    if (recording || recordStarting) return;
    commit({ ...p, tempoLaneVisible: true, tempoLaneCollapsed: true, tempoAutomation: ((_a2 = p.tempoAutomation) == null ? void 0 : _a2.length) ? p.tempoAutomation : [{ time: 0, value: p.bpm }] });
    setAutomation({ channel: "tempo", param: "bpm", min: 30, max: 300, value: p.bpm, label: "BPM" });
  }
  function openMarker(marker = null, time = cursor) {
    var _a2;
    setPlaylistOptions(false);
    setMarkerEdit(marker ? { ...marker } : { id: null, name: "Section " + ((((_a2 = p.markers) == null ? void 0 : _a2.length) || 0) + 1), time: grid(time) });
  }
  function saveMarker() {
    if (!(markerEdit == null ? void 0 : markerEdit.name.trim()) || !Number.isFinite(markerEdit.time)) return;
    const marker = { ...markerEdit, id: markerEdit.id || crypto.randomUUID(), name: markerEdit.name.trim(), time: Math.max(0, markerEdit.time) };
    commit({ ...p, markers: [...(p.markers || []).filter((m) => m.id !== marker.id), marker].sort((a, b) => a.time - b.time) });
    setMarkerEdit(null);
  }
  function selectMarkerRange(id) {
    if (recording || recordStarting) return;
    const range = markerRange(p.markers || [], id);
    if (!range) return;
    position.current = range.start;
    setCursor(range.start);
    commit({ ...p, loop: { enabled: true, ...range } });
  }
  function dragMarker(e, marker) {
    var _a2, _b2;
    if (marker.locked || recording || recordStarting || e.button !== void 0 && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const original = project.current, x = e.clientX, initialScroll = ((_a2 = timeline.current) == null ? void 0 : _a2.scrollLeft) || 0, element = e.currentTarget;
    let next = original, moved = false;
    const cleanup2 = () => {
      var _a3;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      try {
        (_a3 = element == null ? void 0 : element.releasePointerCapture) == null ? void 0 : _a3.call(element, e.pointerId);
      } catch {
      }
      markerCleanup.current = null;
    };
    const move = (ev) => {
      var _a3;
      if (!moved && Math.abs(ev.clientX - x) < 4) return;
      moved = true;
      const el = timeline.current;
      if (el == null ? void 0 : el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect();
        if (ev.clientX > rect.right - 24) el.scrollLeft += 12;
        else if (ev.clientX < rect.left + 24) el.scrollLeft = Math.max(0, el.scrollLeft - 12);
      }
      const time = grid(Math.max(0, marker.time + (ev.clientX - x + (((_a3 = timeline.current) == null ? void 0 : _a3.scrollLeft) || 0) - initialScroll) / zoom));
      next = { ...original, markers: original.markers.map((m) => m.id === marker.id ? { ...m, time } : m).sort((a, b) => a.time - b.time) };
      setP(next);
    };
    const up = () => {
      cleanup2();
      if (moved) {
        suppressMarkerClick.current = Date.now() + 300;
        setHistory((h) => ({ undo: [...h.undo.slice(-39), original], redo: [] }));
        setDirty(true);
      }
    };
    const cancel = () => {
      cleanup2();
      if (moved) setP(original);
    };
    markerCleanup.current = cleanup2;
    try {
      (_b2 = element == null ? void 0 : element.setPointerCapture) == null ? void 0 : _b2.call(element, e.pointerId);
    } catch {
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
  }
  function copyClip() {
    var _a2, _b2, _c2;
    if (!clip) return;
    clipboard.current = { clip: structuredClone(clip), assets: [clip.asset, (_a2 = clip.pitchSource) == null ? void 0 : _a2.asset, (_b2 = clip.stretchSource) == null ? void 0 : _b2.asset, (_c2 = clip.tempoSource) == null ? void 0 : _c2.asset].filter(Boolean).map((id) => assets.current.get(id)).filter(Boolean) };
    setStatus("Clip copied");
  }
  function pasteClip() {
    const copied = clipboard.current;
    if (!copied || recording || busy) return;
    let state = project.current, target = state.tracks.find((t2) => t2.id === selected) || state.tracks.find((t2) => t2.id === copied.clip.track);
    if (target && (target.frozen||target.locked)) {
      setStatus("Unfreeze this track before pasting");
      return;
    }
    if (!target) {
      if (state.tracks.length >= MAX_TRACKS) {
        setStatus("Maximum 128 tracks. Delete a track before pasting to a new track.");
        return;
      }
      target = newTrack(state.tracks.length + 1, state.tracks);
      state = { ...state, tracks: [...state.tracks, target] };
    }
    for (const a of copied.assets) assets.current.set(a.id, a);
    const pasted = { ...structuredClone(copied.clip), id: crypto.randomUUID(), track: target.id, start: grid(position.current) };
    commit({ ...state, clips: resolveClipPriority([...state.clips, pasted], [pasted.id], pasted.id) });
    setSelected(target.id);
    setClipId(pasted.id);
    setRevision((n) => n + 1);
  }
  function setClipGain(id, gainDb) {
    if(recording||busy||!editableTrack(p,p.clips.find(c=>c.id===id)?.track))return;
    commit({ ...p, clips: p.clips.map((c) => selectionIds(p,selectedClips,id).includes(c.id) ? { ...c, gainDb } : c) });
  }
  function dragClipGain(e, cl) {
    var _a2;
    if (recording || busy || !editableTrack(p,cl.track)) return;
    e.preventDefault();
    e.stopPropagation();
    setClipId(cl.id);
    setSelected(cl.track);
    const ids=selectionIds(p,selectedClips,cl.id);setSelectedClips(ids);const original = project.current, y = e.clientY, base = cl.gainDb === null ? -96 : cl.gainDb ?? 0;
    let next = original;
    const move = (ev) => {
      const value = Math.max(-96, Math.min(36, base + (y - ev.clientY) * 0.5)), gainDb = value <= -96 ? null : Math.round(value * 10) / 10;
      next=adjustSelection(original,ids,'gain',(y-ev.clientY)*.5);
      setP(next);
    };
    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      if (next !== original) {
        setHistory((h) => ({ undo: [...h.undo.slice(-39), original], redo: [] }));
        setDirty(true);
      }
    };
    const cancel = () => {
      setP(original);
      next = original;
      finish();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
  }
  function undo(redo = false) {
    if (recording) return;
    const source = redo ? history.redo : history.undo;
    if (!source.length) return;
    const prev = source.at(-1);
    setHistory(redo ? { undo: [...history.undo, p], redo: source.slice(0, -1) } : { undo: source.slice(0, -1), redo: [...history.redo, p] });
    setP(prev);
    setDirty(true);
  }
  async function demo() {
    if(recording||recordStarting||busy)return;
    if (p.clips.length && !confirm("Add the demo to this project?")) return;
    setBusy(true);
    try {
      const c = await audio(), sr = c.sampleRate, seconds = 16, clips = [], tracks = [];
      for (let part = 0; part < 3; part++) {
        const b = c.createBuffer(2, sr * seconds, sr);
        for (let ch = 0; ch < 2; ch++) {
          const d = b.getChannelData(ch);
          for (let i = 0; i < d.length; i++) {
            const t3 = i / sr, beat = t3 % 0.5;
            let v = 0;
            if (part === 0) v = Math.sin(2 * Math.PI * (48 * beat + 10 * (1 - Math.exp(-beat * 35)))) * Math.exp(-beat * 24) * 0.65 + (Math.random() * 2 - 1) * Math.exp(-(t3 % 0.25) * 120) * 0.12;
            if (part === 1) {
              const freq = [130.81, 110, 164.81, 146.83][Math.floor(t3 / 4) % 4];
              v = (Math.sin(2 * Math.PI * freq * t3) + 0.25 * Math.sin(4 * Math.PI * freq * t3)) * Math.exp(-(t3 % 0.5) * 7) * 0.22;
            }
            if (part === 2) {
              const freq = [261.63, 220, 329.63, 293.66][Math.floor(t3 / 4) % 4];
              v = (Math.sin(2 * Math.PI * freq * t3) + Math.sin(2 * Math.PI * freq * 1.25 * t3) + Math.sin(2 * Math.PI * freq * 1.5 * t3)) * 0.055 * Math.min(1, t3 / 1.5, (seconds - t3) / 1.5);
            }
            d[i] = v;
          }
        }
        const id = crypto.randomUUID(), t2 = { ...newTrack(part + 1, [...p.tracks, ...tracks]), name: ["Drums", "Bass", "Keys"][part], effects:demoEffects(part) };
        tracks.push(t2);
        assets.current.set(id, { id, name: t2.name + ".wav", bytes: wav(b), buffer: b });
        clips.push({ id: crypto.randomUUID(), asset: id, track: t2.id, name: t2.name, start: 0, offset: 0, duration: seconds });
      }
      if (p.tracks.length + 3 > MAX_TRACKS && p.clips.length) throw Error("Need three available tracks for the demo.");
      let next={...p,name:p.clips.length?p.name:'Sunday sessions',tracks:p.clips.length?[...p.tracks,...tracks]:tracks,clips:[...p.clips,...clips],mixerChannels:[...(p.mixerChannels||[])]};for(const source of tracks){const used=new Set(next.mixerChannels.map(c=>c.mixerIndex)),index=Array.from({length:MAX_TRACKS},(_,i)=>i+1).find(n=>!used.has(n));if(!index)throw Error('No available mixer channels');const insert={...makeMixerChannel(index,next.mixerChannels),effects:source.effects,color:source.color};next={...next,mixerChannels:[...next.mixerChannels,insert],tracks:next.tracks.map(t=>t.id===source.id?{...t,effects:[],mixerTarget:insert.id}:t)};}commit(next);
      setSelected(tracks[0].id);
      setRevision((x) => x + 1);
      setStatus("Demo loaded · press Play and make it yours");
    } catch (e) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }
  function changedChannel(state, id, changes) {
    if (id === "master") {
      const { volume, ...rest } = changes;
      return { ...state, master: volume ?? state.master, masterChannel: { ...state.masterChannel, ...rest } };
    }
    const key = state.tracks.some((t2) => t2.id === id) ? "tracks" : state.mixerChannels?.some(c=>c.id===id)?"mixerChannels":"buses";
    return { ...state, [key]: (state[key] || []).map((t2) => t2.id === id ? { ...t2, ...changes } : t2) };
  }
  function changeTrack(id, changes) {
    if (changes.output && !changes.outputs) changes = { ...changes, outputs: [changes.output], outputMaster: false };
    if (changes.outputs) changes = { ...changes, output: changes.outputs[0] || "master" };
    const next = changedChannel(project.current, id, changes);
    try {
      validateRouting(next);
    } catch (e) {
      setStatus(e.message);
      return;
    }
    commit(next);
  }
  function setMixerTarget(id,index){try{const next=assignMixerTarget(project.current,id,index);commit(next);setSelected(id);}catch(error){setStatus(error.message);}}
  function addMixerChannel(){const state=project.current,list=state.mixerChannels||[],used=new Set(list.map(c=>c.mixerIndex)),index=Array.from({length:MAX_TRACKS},(_,i)=>i+1).find(n=>!used.has(n));if(!index)return;const channel=makeMixerChannel(index,list);commit({...state,mixerChannels:[...list,channel].sort((a,b)=>a.mixerIndex-b.mixerIndex)});setSelected(channel.id);}
  function addTrack() {
    if (p.tracks.length >= MAX_TRACKS) return;
    const t2 = newTrack(p.tracks.length + 1, p.tracks);
    commit({ ...p, tracks: [...p.tracks, t2] });
    setSelected(t2.id);
  }
  function deleteBus(id) {
    commit(removeRoute(p, id));
    setSelected("master");
  }
  function showTrackMenu(e, id) {
    e.stopPropagation();
    setColorMenu(false);
    const r = e.currentTarget.getBoundingClientRect();
    setTrackMenu((trackMenu == null ? void 0 : trackMenu.id) === id ? null : { id, x: Math.max(5, Math.min(r.left, window.innerWidth - 410)), y: Math.max(5, Math.min(r.bottom + 4, window.innerHeight - 330)) });
  }
  function newProject() {
    statistics.reset(newStatistics());setSelectedClips([]);retakePending.current=null;
    var _a2;
    setNotes("");
    (_a2 = tempoAbort.current) == null ? void 0 : _a2.abort();
    tempoJob.current++;
    stop();
    setRecordArmed(false);
    recordingBuffer.current = null;
    const kind=pendingTemplate.current;pendingTemplate.current='default';const next = initial();next.template=kind;
    if(kind==='recording')for(const name of ['Beat','Insert 1','Insert 2','Insert 3'])next.tracks.push({...makeTrack(next.tracks.length+1,next.tracks),name});
    if(kind==='maxed'){for(let i=1;i<=MAX_TRACKS;i++){next.tracks.push(makeTrack(i,next.tracks));next.mixerChannels.push(makeMixerChannel(i,next.mixerChannels));}}
    setRecordTargets([]);
    project.current = next;
    setP(next);
    assets.current.clear();
    setHistory({ undo: [], redo: [] });
    handle.current = null;saveFolder.current=null;
    setDirty(false);
    setSelected(null);
    setClipId(null);
    setDialog(null);
    setMenu(false);
    setStatus("New project");
  }
  function trackAction(t2, action) {
    if(t2.locked&&['delete','up','down'].includes(action)){setStatus('Unlock this track first');return;}
    const list = [...p.tracks], i = list.findIndex((x) => x.id === t2.id);
    if (action === "delete") {
      commit({ ...removeRoute(p,t2.id), clips: p.clips.filter((c) => c.track !== t2.id) });
      if (selected === t2.id) setSelected(null);
    }
    if (action === "duplicate" && list.length < MAX_TRACKS) {
      const copy = { ...structuredClone(t2), id: crypto.randomUUID(), name: t2.name + " - Copy", collapsed: t2.collapsed, color: newTrack(p.tracks.length + 1, p.tracks).color };
      list.splice(i + 1, 0, copy);
      const copiedClips=p.clips.filter(c=>c.track===t2.id).map(c=>({...c,id:crypto.randomUUID(),track:copy.id}));
      commit({...p,tracks:list,clips:[...p.clips,...copiedClips]});
      setSelected(copy.id);setClipId(copiedClips[0]?.id||null);setSelectedClips(copiedClips.map(c=>c.id));
    }
    if (action === "up" && i > 0 || action === "down" && i < list.length - 1) {
      const j = i + (action === "up" ? -1 : 1);
      [list[i], list[j]] = [list[j], list[i]];
      commit({ ...p, tracks: list });
    }
    if (action === "rename") {
      setRenaming(t2.id);
    }
    setTrackMenu(null);
  }
  async function requestSave(chooseFolder=false,downloadsOnly=false) {
    setBusy(true);
    let folder=downloadsOnly?null:saveFolder.current,plan=nextProjectSave(p);
    try{
      if(chooseFolder&&window.showDirectoryPicker)folder=await window.showDirectoryPicker({id:'tabrec-project',mode:'readwrite',...(folder?{startIn:folder}:{})});
      else if(chooseFolder)folder=null;
      if(folder)plan=await availableProjectSave(folder,plan);
    }catch(error){setBusy(false);afterSave.current=false;if(error.name!=='AbortError')setStatus('Save failed: '+error.message);return;}
    const success = await save(true, plan.name, plan,folder,downloadsOnly||(!chooseFolder&&!folder));
    if (success) {
      setDialog(null);
      if (afterSave.current) {
        afterSave.current = false;
        newProject();
      }
    } else afterSave.current = false;
  }
  async function openProject() {
    if (window.showOpenFilePicker) {
      try {
        const [h] = await window.showOpenFilePicker({ types: [{ description: "DAW project", accept: { "application/json": [".trstudio", ".bdaw"] } }] });
        await open(await h.getFile(), h);
      } catch (e) {
        if (e.name !== "AbortError") setStatus(e.message);
      }
    } else openInput.current.click();
  }
  function setGroup(id, changes) {
    commit({ ...p, groups: p.groups.map((g) => g.id === id ? { ...g, ...changes } : g) });
  }
  function groupTrack(id, value) {
    if (value === "new") {
      const name = prompt("Group name", "Track group");
      if (!(name == null ? void 0 : name.trim())) return;
      const group = { id: crypto.randomUUID(), name: name.trim(), collapsed: false };
      commit({ ...p, groups: [...p.groups, group], tracks: p.tracks.map((t2) => t2.id === id ? { ...t2, group: group.id } : t2) });
    } else changeTrack(id, { group: value || null });
  }
  function moveGroup(id, delta) {
    if(p.tracks.some(t=>t.group===id&&t.locked)){setStatus("Unlock group members first");return;}
    const indices = p.tracks.map((t2, i) => t2.group === id ? i : -1).filter((i) => i >= 0);
    if (!indices.length) return;
    const members = p.tracks.filter((t2) => t2.group === id), rest = p.tracks.filter((t2) => t2.group !== id), at = delta < 0 ? Math.max(0, indices[0] - 1) : Math.min(rest.length, indices[0] + 1);
    rest.splice(at, 0, ...members);
    commit({ ...p, tracks: rest });
  }
  function startAutomation(channel, param2, min, max, value, label) {
    var _a2;
    if ((_a2 = channels.find((c) => c.id === channel)) == null ? void 0 : _a2.frozen) {
      setStatus("Unfreeze before editing automation");
      return;
    }
    if(channel==='master'){const master=masterChannel(p),points=master.automation?.[param2];commit({...p,masterLaneVisible:true,masterLaneCollapsed:true,masterLaneParam:param2,masterChannel:{...p.masterChannel,automation:{...master.automation,[param2]:points?.length?points:[{time:0,value}]}}});}
    setSelected(channel);
    setAutomation({ channel, param: param2, min, max, value, label });
    setCollapsed(false);
  }
  function controlContext(e) {
    e.preventDefault();
    var _a2, _b2;
    const el = (_b2 = (_a2 = e.target).closest) == null ? void 0 : _b2.call(_a2, "[data-param]");
    if (!el || el.dataset.noauto) return;
    e.preventDefault();
    const min = Number(el.min ?? el.getAttribute("aria-valuemin")), max = Number(el.max ?? el.getAttribute("aria-valuemax")), value = Number(el.value ?? el.getAttribute("aria-valuenow"));
    startAutomation(el.dataset.channel || track.id, el.dataset.param, min, max, value, el.getAttribute("aria-label") || el.title || el.dataset.param);
  }
  function updateAutomation(points) {
    if (automation.channel === "tempo") {
      commit({ ...p, tempoAutomation: points });
      return;
    }
    const channel = channels.find((c) => c.id === automation.channel);
    changeTrack(channel.id, { automation: { ...channel.automation, [automation.param]: points } });
  }
  useEffect(()=>{const receive=e=>setHelp({label:e.detail.label,text:previewText(e.detail)});window.addEventListener('tabrec-control-preview',receive);return()=>window.removeEventListener('tabrec-control-preview',receive);},[]);
  // Chromium emits input before change for native selects. Do not re-render the
  // controlled select before its onChange has committed the new option.
  function describeInput(e){if(e.target?.tagName?.toUpperCase()==='SELECT')return;describe(e);}
  function describe(e) {
    var _a2, _b2, _c2, _d2, _e2, _f2, _g;
    const el = (_b2 = (_a2 = e.target).closest) == null ? void 0 : _b2.call(_a2, "button,input,select,[role=slider],[data-description]");
    if (!el) return;
    const label = el.getAttribute("aria-label") || el.title || ((_c2 = el.textContent) == null ? void 0 : _c2.trim()) || "Control";
    let value = "";
    if (el.type === "range" || el.getAttribute("role") === "slider") {
      const n = Number(el.value ?? el.getAttribute("aria-valuenow")), min = Number(el.min ?? el.getAttribute("aria-valuemin")), max = Number(el.max ?? el.getAttribute("aria-valuemax"));
      value = Number.isFinite(n) ? ((_d2 = el.dataset) == null ? void 0 : _d2.param) === "volume" ? (n ? 20 * Math.log10(n) : -Infinity).toFixed(1) + " dB · " + Math.round(n * 100) + "% gain" : n.toFixed(2) + " · " + Math.round((n - min) / (max - min || 1) * 100) + "%" : "";
    } else if (el.tagName === "SELECT") value = ((_f2 = (_e2 = el.options) == null ? void 0 : _e2[el.selectedIndex]) == null ? void 0 : _f2.text) || "";
    else if (el.getAttribute("aria-pressed") !== null) value = el.getAttribute("aria-pressed") === "true" ? "On" : "Off";
    const descriptions = {"Undo":"Revert the last action. Press Ctrl + Z to undo","Redo":"Restore the last undone action. Press Ctrl + Y to redo","Cut / split at playhead":"Slices the audio clip on selection. Press S to cut.","Duplicate clip":"Creates a copied track of the selected audio clip to a new track.","Delete clip":"Remove selection without copying. Press Ctrl + X to delete","Play":"Play. Press Space to Play/Pause","Pause":"Play. Press Space to Play/Pause","Stop":"Stop and turn playhead back to beginning. Press Enter to Stop.","Loop":"Loop between selected area on playlist. Press C to toggle on/off.", "Save Project": "Save a new project copy to your device.", "Snap to grid": "Snap clip moves, trims, loop selection and automation nodes to the selected playlist grid.", "Freeze audio": "Render this track with its effects and automation. Originals are retained for unfreeze.", "Master FX": "Edit the effect chain applied to the complete mix." };
    setHelp({ label, text: (((_g = el.dataset) == null ? void 0 : _g.description) || descriptions[label] || el.title || "Adjust this control. Double-click sliders/knobs to reset; right-click to automate.") + (value ? "\n" + value : "") });
  }
  async function transformClip(reverse = (clip == null ? void 0 : clip.reversed) || false, semitones = pitch) {
    var _a2;
    if (!clip || busy || recording || !editableTrack(p,clip.track)) return;
    pause();
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 0));
      const c = await audio(), source = clip.pitchSource || { asset: clip.asset, offset: clip.offset, duration: clip.duration }, buffer = renderTransform(c, source, assets.current.get(source.asset).buffer, semitones, reverse), id = crypto.randomUUID();
      assets.current.set(id, { id, name: clip.name + " rendered.wav", bytes: floatWav(buffer), buffer });
      commit({ ...p, clips: p.clips.map((cl) => cl.id === clip.id ? { ...cl, asset: id, offset: 0, duration: buffer.duration, pitchSource: source, stretchSource: void 0, tempoSource: void 0, pitch: semitones, reversed: reverse } : cl) });
      setRevision((n) => n + 1);
      setStatus("Selected clip rendered independently · " + semitones + " semitones" + (reverse ? " · reversed" : ""));
    } catch (e) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function freezeTrack(t2) {
    if(t2.locked){setStatus('Unlock this track first');return;}
    setTrackMenu(null);
    if (!t2.frozen && channels.some((c) => c.id !== t2.id && routeDestinations(c).includes(t2.id))) {
      setStatus("Disconnect incoming routes before freezing this receiving track");
      return;
    }
    if (t2.frozen) {
      commit({ ...p, tracks: p.tracks.map((x) => x.id === t2.id ? { ...x, ...x.frozenBackup.settings, frozen: false, frozenBackup: void 0 } : x), clips: [...p.clips.filter((c) => c.track !== t2.id), ...t2.frozenBackup.clips.map((c) => ({ ...c, id: crypto.randomUUID(), track: t2.id }))] });
      return;
    }
    if (!p.clips.some((c) => c.track === t2.id)) {
      setStatus("Import or record audio before freezing");
      return;
    }
    pause();
    setBusy(true);
    try {
      const state = { ...initial(), effectsBypass: p.effectsBypass, tracks: [{ ...t2, mixerTarget:"master", outputs: ["master"], output: "master", mute: false, solo: false }], clips: p.clips.filter((c2) => c2.track === t2.id) }, length = Math.max(...state.clips.map((c2) => c2.start + c2.duration)) + effectTail(state), c = new OfflineAudioContext(2, Math.ceil(length * 48e3), 48e3);
      await initGate(c);
      const mix = buildMix(c, state, c.destination);
      scheduleAutomation(state, mix, 0, Infinity, 0);
      for (const cl of resolveClipPriority(state.clips)) scheduleClip(c, cl, assets.current.get(cl.asset).buffer, mix.map[t2.id].source, 0, Infinity, 0);
      const buffer = await c.startRendering(), id = crypto.randomUUID();
      assets.current.set(id, { id, name: t2.name + " frozen.wav", bytes: floatWav(buffer), buffer });
      const frozenBackup = { settings: { volume: t2.volume, pan: t2.pan, stereoWidth: t2.stereoWidth, stereoSeparation: stereoSeparation(t2), swapChannels: t2.swapChannels, invertPolarity: t2.invertPolarity, effects: t2.effects, automation: t2.automation || {} }, clips: state.clips };
      commit({ ...p, tracks: p.tracks.map((x) => x.id === t2.id ? { ...x, frozen: true, frozenBackup, effects: [], automation: {}, volume: 1, pan: 0, stereoWidth: 1, stereoSeparation: 0, swapChannels: false, invertPolarity: false } : x), clips: [...p.clips.filter((cl) => cl.track !== t2.id), { id: crypto.randomUUID(), asset: id, track: t2.id, name: t2.name + " (frozen)", start: 0, offset: 0, duration: buffer.duration, fadeIn: 0, fadeOut: 0 }] });
      setRevision((n) => n + 1);
      setStatus("Track frozen · original clips retained for unfreeze");
    } catch (e) {
      setStatus("Freeze failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }
  function setEffects(effects) {
    if (fxTrack) changeTrack(fxTrack.id, { effects });
  }
  function confirmEffectDeletion(){const request=effectToRemove;if(!request||recording||recordStarting||busy)return;if(request.kind==='mixer'){deleteMixerChannel(request.channel,true);return;}if(request.kind==='all'){const channel=channelList(project.current).find(c=>c.id===request.channel)|| (request.channel==='master'?masterChannel(project.current):null);if(channel)changeTrack(request.channel,{effects:[],automation:Object.fromEntries(Object.entries(channel.automation||{}).filter(([key])=>!key.startsWith('fx.')))});setEffectToRemove(null);setAutomation(previous=>previous?.channel===request.channel&&previous.param?.startsWith('fx.')?null:previous);return;}removeEffect(request.channel,request.id);}
  function removeEffect(channelId, effectId) {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return;
    changeTrack(channelId, { effects: channel.effects.filter((e) => e.id !== effectId), automation: Object.fromEntries(Object.entries(channel.automation || {}).filter(([key]) => !key.startsWith("fx." + effectId + "."))) });
    setEffectToRemove(null);
  }
  function requestRemoveEffect(effect) {
    if (effectHasChanges(effect, fxTrack.automation)) setEffectToRemove({ channel: fxTrack.id, id: effect.id, name: FX_NAMES[effect.type] });
    else removeEffect(fxTrack.id, effect.id);
  }
  function effectValue(id, key, value) {
    setEffects(fxTrack.effects.map((e) => e.id === id ? { ...e, params: { ...e.params, [key]: value } } : e));
  }
  function beginEffectReorder(e, id) {
    var _a2, _b2;
    if (e.button !== void 0 && e.button !== 0 || recording || busy || fxTrack.frozen) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget, rack = el.closest(".effect-rack"), doc = el.ownerDocument;
    if (!rack || !doc) return;
    (_a2 = reorderCleanup.current) == null ? void 0 : _a2.call(reorderCleanup);
    const original = project.current, channelId = fxTrack.id, originalEffects = fxTrack.effects, startX = e.clientX, startY = e.clientY;
    let list = originalEffects, moved = false;
    const cleanup2 = () => {
      var _a3;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      try {
        (_a3 = el.releasePointerCapture) == null ? void 0 : _a3.call(el, e.pointerId);
      } catch {
      }
      reorderCleanup.current = null;
    };
    const move = (ev) => {
      var _a3;
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 4) return;
      moved = true;
      setReorderingFx(id);
      const bounds = rack.getBoundingClientRect();
      if (ev.clientX > bounds.right - 24) rack.scrollLeft += 12;
      else if (ev.clientX < bounds.left + 24) rack.scrollLeft -= 12;
      const card = (_a3 = doc.elementFromPoint(ev.clientX, ev.clientY)) == null ? void 0 : _a3.closest(".effect");
      if (!card || card.closest(".effect-rack") !== rack) return;
      const targetId = card.dataset.effectId, from = list.findIndex((x) => x.id === id), to = list.findIndex((x) => x.id === targetId);
      if (from < 0 || to < 0 || from === to) return;
      const rect = card.getBoundingClientRect(), mid = rect.left + rect.width / 2;
      if (from < to && ev.clientX < mid || from > to && ev.clientX > mid) return;
      const next = reorderEffects(list, id, targetId);
      if (next !== list) {
        list = next;
        setP(changedChannel(original, channelId, { effects: list }));
      }
    };
    const up = () => {
      cleanup2();
      setReorderingFx(null);
      if (list.map((x) => x.id).join() !== originalEffects.map((x) => x.id).join()) {
        setHistory((h) => ({ undo: [...h.undo.slice(-39), original], redo: [] }));
        setDirty(true);
      }
    };
    const cancel = () => {
      cleanup2();
      setReorderingFx(null);
      if (list !== originalEffects) setP(changedChannel(project.current, channelId, { effects: originalEffects }));
    };
    reorderCleanup.current = cleanup2;
    try {
      (_b2 = el.setPointerCapture) == null ? void 0 : _b2.call(el, e.pointerId);
    } catch {
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
  }
  function moveEffect(id, delta) {
    const list = [...fxTrack.effects], i = list.findIndex((e) => e.id === id), j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setEffects(list);
  }
  function openEffectPicker(index = null,event) {
    const rect=event?.currentTarget?.getBoundingClientRect?.();setFxAnchor({x:event?.clientX||rect?.left||12,y:event?.clientY||rect?.bottom||window.innerHeight-60});
    setFxInsert(index);
    setEffectsMenu(false);
    setAddFx(true);
  }
  function addEffect(type) {
    const list = [...fxTrack.effects || []];
    list.splice(fxInsert === null ? list.length : Math.max(0, Math.min(list.length, fxInsert)), 0, { id: crypto.randomUUID(), type, enabled: true, params: defaults() });
    setEffects(list);
    setAddFx(false);
    setFxInsert(null);
    setEffectsMenu(false);
  }
  function tapTempo() {
    const now = performance.now();
    taps.current = taps.current.filter((t2) => now - t2 < 3e3);
    taps.current.push(now);
    taps.current = taps.current.slice(-6);
    if (taps.current.length > 1) {
      const bpm = Math.round(6e4 * (taps.current.length - 1) / (now - taps.current[0]));
      commit({ ...p, bpm: Math.max(30, Math.min(300, bpm)) });
    }
  }
  function dragBpm(e) {
    if (recording) return;
    const y = e.clientY, b = p.bpm, original = project.current;
    let value = b;
    const move = (ev) => {
      value = Math.max(30, Math.min(300, Math.round(b + (y - ev.clientY) / 2)));
      setP({ ...original, bpm: value });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (value !== b) {
        if (original.clips.length) changeTempo(original, { ...original, bpm: value });
        else {
          setHistory((h) => ({ undo: [...h.undo.slice(-39), original], redo: [] }));
          setDirty(true);
        }
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  function dragLoopBoundary(e,edge){if(recording||recordStarting)return;e.preventDefault();e.stopPropagation();const original=project.current,rect=e.currentTarget.parentElement.getBoundingClientRect(),view=e.currentTarget.ownerDocument?.defaultView||window;let next=original;const move=ev=>{const value=grid(Math.max(0,(ev.clientX-rect.left)/zoom)),loop={...original.loop,enabled:true,[edge]:edge==='start'?Math.min(original.loop.end-.01,value):Math.max(original.loop.start+.01,value)};next={...original,loop};setP(next);},end=ev=>{view.removeEventListener('pointermove',move);view.removeEventListener('pointerup',end);view.removeEventListener('pointercancel',end);if(ev.type==='pointercancel')setP(original);else if(next!==original)commit(next);};view.addEventListener('pointermove',move);view.addEventListener('pointerup',end);view.addEventListener('pointercancel',end);}
  function selectLoop(e) {
    if (recording) return;
    const rect = e.currentTarget.getBoundingClientRect(), a = grid(Math.max(0, (e.clientX - rect.left) / zoom));
    if (!p.loop.enabled) {
      seek(Math.max(0, (e.clientX - rect.left) / zoom));
      const move2 = (ev) => seek(Math.max(0, (ev.clientX - rect.left) / zoom)), up2 = () => {
        window.removeEventListener("pointermove", move2);
        window.removeEventListener("pointerup", up2);
        window.removeEventListener("pointercancel", up2);
      };
      window.addEventListener("pointermove", move2);
      window.addEventListener("pointerup", up2);
      window.addEventListener("pointercancel", up2);
      return;
    }
    const original = project.current;
    let b = a;
    const move = (ev) => {
      b = grid(Math.max(0, (ev.clientX - rect.left) / zoom));
      setP({ ...original, loop: { enabled: true, start: Math.min(a, b), end: Math.max(a, b) + 0.05 } });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (Math.abs(b - a) < 0.05) {
        seek(a);
        return;
      }
      commit({ ...original, loop: { enabled: true, start: Math.min(a, b), end: Math.max(a, b) } });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  async function writeFile(blob, name, extension, existingHandle) {
    if (window.showSaveFilePicker) {
      const h = existingHandle || await window.showSaveFilePicker({ suggestedName: name, types: [{ description: extension.toUpperCase() + " file", accept: { [extension === "wav" ? "audio/wav" : extension === "mp3" ? "audio/mpeg" : extension === "zip" ? "application/zip" : "application/json"]: ["." + extension] } }] });
      const w = await h.createWritable();
      await w.write(blob);
      await w.close();
    } else download(blob, name);
  }
  function openTools() {
    var _a2, _b2;
    setToolsError("");
    setCleanupTrack(((_a2 = p.tracks.find((t2) => t2.id === selected && p.clips.some((c) => c.track === t2.id))) == null ? void 0 : _a2.id) || ((_b2 = p.tracks.find((t2) => p.clips.some((c) => c.track === t2.id))) == null ? void 0 : _b2.id) || "");
    setMenu(false);
    setSettings(false);
    setToolsHome(true);
    setToolsOpen(false);
  }
  async function removeSilenceInPlace() {
    var _a2, _b2;
    const state = project.current, t2 = state.tracks.find((t3) => t3.id === cleanupTrack);
    if (!t2 || t2.frozen||t2.locked) {
      setToolsError("Select an unfrozen audio track first.");
      return;
    }
    pause();
    setToolsError("");
    setBusy(true);
    setToolRunning(true);
    const controller = new AbortController();
    cleanupAbort.current = controller;
    try {
      const originals = state.clips.filter((c) => c.track === t2.id), parts = [];
      let changed = false;
      for (const clip2 of originals) {
        const buffer = assets.current.get(clip2.asset).buffer, sr = buffer.sampleRate, from = Math.round(clip2.offset * sr), to = Math.round((clip2.offset + clip2.duration) * sr), channels2 = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c).slice(from, to)), size = channels2[0].length;
        const result = await runCleanupWorker(channels2, sr, "regions", { ...cleanupOptions, gain: clipGain(clip2), fadeIn: clip2.fadeIn || 0, fadeOut: clip2.fadeOut || 0 }, controller.signal);
        if (result.regions.length === 1 && result.regions[0][0] === 0 && result.regions[0][1] === size) parts.push(clip2);
        else {
          changed = true;
          parts.push(...clipsFromRegions(clip2, result.regions, buffer, ((_a2 = state.editOptions) == null ? void 0 : _a2.zeroCrossing) !== false));
        }
      }
      if (controller.signal.aborted) throw Object.assign(Error("Cancelled"), { name: "AbortError" });
      if (changed) {
        commit({ ...state, clips: [...state.clips.filter((c) => c.track !== t2.id), ...parts] });
        setClipId(((_b2 = parts[0]) == null ? void 0 : _b2.id) || null);
      }
      setToolsOpen(false);
      setStatus(changed ? "Silence removed in place. Undo restores the original clips." : "No silence found at this threshold.");
    } catch (e) {
      if (e.name !== "AbortError") setToolsError(e.message);
    } finally {
      cleanupAbort.current = null;
      setBusy(false);
      setToolRunning(false);
    }
  }
  async function runCleanup() {
    var _a2;
    const state = project.current, t2 = state.tracks.find((t3) => t3.id === cleanupTrack);
    if (cleanupType === "trim") {
      removeSilenceInPlace();
      return;
    }
    if (state.tracks.length >= MAX_TRACKS) {
      setToolsError("All 128 tracks are in use. Delete a track to continue.");
      return;
    }
    if (!t2 || !state.clips.some((c) => c.track === t2.id)) {
      setToolsError("Select a track with audio first.");
      return;
    }
    if (channels.some((c) => c.id !== t2.id && routeDestinations(c).includes(t2.id))) {
      setToolsError("Disconnect incoming routes before cleaning this receiving track.");
      return;
    }
    pause();
    const controller = new AbortController();
    cleanupAbort.current = controller;
    setToolsError("");
    setBusy(true);
    setToolRunning(true);
    try {
      const clips = resolveClipPriority(state.clips.filter((c) => c.track === t2.id)), anchor = Math.min(...clips.map((c) => c.start)), length = Math.max(...clips.map((c) => c.start + c.duration)) - anchor, sr = assets.current.get(clips[0].asset).buffer.sampleRate, context = new OfflineAudioContext(2, Math.max(1, Math.ceil(length * sr)), sr);
      for (const cl of clips) scheduleClip(context, { ...cl, start: cl.start - anchor }, assets.current.get(cl.asset).buffer, context.destination, 0, Infinity, 0);
      const dry = await context.startRendering();
      if (controller.signal.aborted) throw Object.assign(Error("Cancelled"), { name: "AbortError" });
      const result = await runCleanupWorker(Array.from({ length: dry.numberOfChannels }, (_, c) => dry.getChannelData(c).slice()), sr, cleanupType, cleanupOptions, controller.signal);
      if (!((_a2 = result.channels[0]) == null ? void 0 : _a2.length)) throw Error("No audible audio remains at this silence threshold.");
      const live = await audio();
      if (controller.signal.aborted) throw Object.assign(Error("Cancelled"), { name: "AbortError" });
      const buffer = live.createBuffer(result.channels.length, result.channels[0].length, sr);
      result.channels.forEach((data, c) => buffer.getChannelData(c).set(data));
      const base = newTrack(state.tracks.length + 1, state.tracks), id = crypto.randomUUID(), label = TOOL_NAMES[cleanupType], fxIds = new Map((t2.effects || []).map((e) => [e.id, crypto.randomUUID()])), effects = (t2.effects || []).map((e) => ({ ...structuredClone(e), id: fxIds.get(e.id) }));
      const automation2 = Object.fromEntries(Object.entries(t2.automation || {}).map(([key, points]) => {
        const parts = key.split(".");
        if (parts[0] === "fx" && fxIds.has(parts[1])) parts[1] = fxIds.get(parts[1]);
        const mapped = new Map(points.map((point) => [mapCleanedTime(point.time, anchor, sr, result.kept, dry.length), point.value]));
        return [parts.join("."), [...mapped].map(([time, value]) => ({ time, value })).sort((a, b) => a.time - b.time)];
      }));
      const cleaned = { ...base, name: t2.name + " - " + label, volume: t2.volume, pan: t2.pan, mixerTarget:t2.mixerTarget||"master", output: t2.output || "master", outputs:t2.outputs, outputMaster:t2.outputMaster, group: t2.group, effects, automation: automation2, solo: t2.solo, mute: false }, tracks = state.tracks.map((track2) => track2.id === t2.id ? { ...track2, mute: true, solo: false } : track2);
      tracks.splice(tracks.findIndex((track2) => track2.id === t2.id) + 1, 0, cleaned);
      assets.current.set(id, { id, name: cleaned.name + ".wav", bytes: floatWav(buffer), buffer });
      const rendered = { id: crypto.randomUUID(), asset: id, track: cleaned.id, name: cleaned.name, start: anchor, offset: 0, duration: buffer.duration, fadeIn: 0, fadeOut: 0, gainDb: 0 };
      commit({ ...state, tracks, groups: state.groups.map((g) => g.id === t2.group ? { ...g, collapsed: false } : g), clips: [...state.clips, rendered] });
      setSelected(cleaned.id);
      setClipId(rendered.id);
      setRevision((n) => n + 1);
      setToolsOpen(false);
      setStatus(label + " rendered to a new track; original muted");
    } catch (e) {
      if (e.name !== "AbortError") setToolsError(e.message);
    } finally {
      cleanupAbort.current = null;
      setBusy(false);
      setToolRunning(false);
    }
  }
  async function checkLatency() {
    try {
      setLatencyResult(latencyEstimate(await audio()));
    } catch (e) {
      setLatencyResult({ error: e.message });
    }
  }
  async function runLatencyCheck() {
    if (recording || recordStarting || busy) return;
    pause();
    const controller = new AbortController();
    latencyAbort.current = controller;
    setLatencyRunning(true);
    setLatencyResult(null);
    try {
      setLatencyResult(await measureLoopback(await audio(), device, controller.signal));
    } catch (e) {
      setLatencyResult({ error: e.name === "AbortError" ? "Latency check cancelled" : e.message });
    } finally {
      latencyAbort.current = null;
      setLatencyRunning(false);
    }
  }
  async function savePreset() {
    if (!fxTrack) return;
    const name = prompt("Effect chain preset name", fxTrack.name + " effects");
    if (!(name == null ? void 0 : name.trim())) return;
    const preset = { format: "bdaw-fx", version: 1, id: crypto.randomUUID(), name: name.trim(), effects: structuredClone(fxTrack.effects) };
    commit({ ...p, presets: [...p.presets || [], preset] });
    try {
      await writeFile(new Blob([JSON.stringify(preset)], { type: "application/json" }), name.trim() + ".trpreset", "trpreset");
      setStatus("Preset added to project and saved separately");
    } catch (e) {
      setStatus(e.name === "AbortError" ? "Preset retained in project; separate file save cancelled" : e.message);
    }
  }
  async function loadPreset(file) {
    if (!file || !fxTrack) return;
    try {
      const preset = JSON.parse(await file.text());
      if (preset.format !== "bdaw-fx" || preset.version !== 1) throw Error("Invalid effects preset");
      validateEffects(preset.effects);
      commit(changedChannel({ ...p, presets: [...p.presets || [], { ...preset, id: crypto.randomUUID() }] }, fxTrack.id, { effects: preset.effects.map((e) => ({ ...e, id: crypto.randomUUID(), params: { ...defaults(), ...e.params } })) }));
      setStatus("Preset loaded");
    } catch (e) {
      setStatus(e.message);
    }
  }
  function checkExport() {
    if (exportCancelled.current) throw Object.assign(Error("Export cancelled"), { name: "AbortError" });
  }
  function cancelExport() {
    exportCancelled.current = true;exportAbort.current?.abort();
    setDialog(null);
    setStatus("Export cancelled");
  }
  async function exportAudio(){
    if(!p.clips.length){setStatus('Import or record audio first');return;}
    const presets=EXPORT_PRESETS.filter(item=>exportChoices.includes(item.id));if(!presets.length){setStatus('Select at least one export version');return;}
    exportCancelled.current=false;const controller=new AbortController();exportAbort.current=controller;setBusy(true);
    try{
      const audible=p.tracks.filter(t=>audibleTrack(p,t)&&(!exportTarget||routePath(p,t.id).some(c=>c.id===exportTarget)));if(!audible.length)throw Error('All tracks are muted');
      const zipped=exportMode==='stems'||presets.length>1,extension=zipped?'zip':presets[0].format,base=(p.tracks.find(t=>t.id===exportTarget)?.name||p.name)+(exportScope==='selection'?'-selection':'')+(exportMode==='stems'?'-stems':''),name=base+'.'+extension;
      const exportHandle=window.showSaveFilePicker?await window.showSaveFilePicker({suggestedName:name,types:[{description:extension.toUpperCase(),accept:{[exportMime(extension)]:['.'+extension]}}]}):null;
      checkExport();const bounds=exportBounds(p,exportScope,effectTail(p)),groups=exportMode==='stems'?audible.filter(t=>p.clips.some(c=>c.track===t.id)).map(t=>[t]):[audible],files={};
      for(let index=0;index<groups.length;index++){
        const tracks=groups[index],context=new OfflineAudioContext(2,Math.max(1,Math.ceil(bounds.end*48000)),48000);await initGate(context);const mix=buildMix(context,p,context.destination);scheduleAutomation(p,mix,0,bounds.end,0);
        for(const cl of resolveClipPriority(p.clips).filter(c=>tracks.some(t=>t.id===c.track)))scheduleClip(context,cl,assets.current.get(cl.asset).buffer,mix.map[cl.track].source||mix.map[cl.track].input,0,Infinity,0);
        const full=await context.startRendering();checkExport();const buffer=exportScope==='selection'?bufferRange(full,bounds.start,bounds.end):full;
        for(const preset of presets){checkExport();const bytes=await encodeExport(buffer,preset,flacLevel,controller.signal),prefix=exportMode==='stems'?String(index+1).padStart(2,'0')+'-'+tracks[0].name:base,suffix=presets.length>1?'-'+exportSuffix(preset):'';files[prefix.replace(/[<>:"/\\|?*]/g,'_')+suffix+'.'+preset.format]=bytes;}
      }
      checkExport();const bytes=zipped?zipSync(files):Object.values(files)[0];await writeFile(new Blob([bytes],{type:exportMime(extension)}),name,extension,exportHandle);const actual=Object.values(files).reduce((sum,file)=>sum+file.length,0);setStatus('Exported '+Object.keys(files).length+' file(s) - '+(actual/1048576).toFixed(2)+' MB');setDialog(null);
    }catch(error){if(error.name!=='AbortError')setStatus('Export failed: '+error.message);}finally{setBusy(false);if(exportAbort.current===controller)exportAbort.current=null;}
  }
  const exportDuration=exportScope==='selection'&&p.loop.enabled?p.loop.end-p.loop.start:Math.max(0,...p.clips.map(c=>c.start+c.duration))+effectTail(p),exportStemCount=exportMode==='stems'?p.tracks.filter(t=>audibleTrack(p,t)&&p.clips.some(c=>c.track===t.id)&&(!exportTarget||routePath(p,t.id).some(c=>c.id===exportTarget))).length:1;
  const param = (effect, label, key, min, max, step = 1, unit = "") => /* @__PURE__ */ React.createElement("label", { className: "param", key }, /* @__PURE__ */ React.createElement("span", { "data-channel": fxTrack.id, "data-param": "fx." + effect.id + "." + key, title: FX_NAMES[effect.type] + " " + label, "aria-valuemin": min, "aria-valuemax": max, "aria-valuenow": effect.params[key] }, label, /* @__PURE__ */ React.createElement("b", null, effect.params[key], unit)), /* @__PURE__ */ React.createElement("input", { "data-channel": fxTrack.id, "data-param": "fx." + effect.id + "." + key, "aria-label": FX_NAMES[effect.type] + " " + label, type: "range", min, max, step, value: controlValue(track, "fx." + effect.id + "." + key, effect.params[key]), onChange: (e) => effectValue(effect.id, key, +e.target.value), onDoubleClick: () => effectValue(effect.id, key, defaults()[key]) }));
  shortcutHandler.current = (e) => {
    var _a2, _b2, _c2, _d2, _e2, _f2, _g;
    if (/INPUT|SELECT|TEXTAREA/.test((_a2 = e.target) == null ? void 0 : _a2.tagName) || ((_b2 = e.target) == null ? void 0 : _b2.isContentEditable) || ((_d2 = (_c2 = e.target) == null ? void 0 : _c2.closest) == null ? void 0 : _d2.call(_c2, ".modal,[role=dialog],[role=alertdialog]")) || settings || controlsOpen || toolsOpen || toolsHome || statisticsOpen || aboutOpen || notepadOpen || markerEdit || effectToRemove || dialog || busy) return;
    const key = (_e2 = e.key) == null ? void 0 : _e2.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if(e.defaultPrevented)return;
    if (mod && !e.altKey) {
      if (key === "c" && clip && !((_g = (_f2 = window.getSelection) == null ? void 0 : _f2.call(window)) == null ? void 0 : _g.toString())) {
        e.preventDefault();
        copyClip();
      } else if (key === "v") {
        e.preventDefault();
        pasteClip();
      } else if (key === "z") {
        e.preventDefault();
        undo(!!e.shiftKey);
      } else if (key === "y") {
        e.preventDefault();
        undo(true);
      } else if(key==='x'){e.preventDefault();edit('delete');} else if (key === "d") {
        e.preventDefault();
        edit("duplicate");
      }
      return;
    }
    if(['arrowleft','arrowright'].includes(key)){if(recording||recordStarting)return;e.preventDefault();const step=4/(p.gridDivision||4),beat=beatPosition(p,position.current,4);seek(beatTime(p,Math.max(0,beat+(key==='arrowleft'?-step:step)),4));return;}
    if (e.repeat) return;
    if (e.code === "Space" || key === " ") {
      e.preventDefault();
      if (!recordAttempt.current) playTransport();
    } else if(key==='s'&&clip&&!recording&&!recordStarting){e.preventDefault();edit('split');}else if(key==='c'&&!recording&&!recordStarting){e.preventDefault();commit({...p,loop:{...p.loop,enabled:!p.loop.enabled}});} else if (key === "r") {
      e.preventDefault();
      toggleRecord();
    } else if (key === "enter") {
      e.preventDefault();
      stop();
    } else if ((key === "delete" || key === "backspace") && clip && !recording && !recordStarting) {
      e.preventDefault();
      edit("delete");
    }
  };
  useEffect(()=>{setCollapsed(mobile);setMixerOpen(!mobile);},[mobile]);
  function focusMobilePlaylist(e){if(!mobile||e.target?.closest?.('button,input,select,[role="slider"]'))return;setMobileDockHidden(true);setCollapsed(true);setMixerOpen(false);}
  function mobilePanel(name){if(name==='effects'){setCollapsed(!collapsed);setMixerOpen(false);}else{setMixerOpen(!mixerOpen);setCollapsed(true);}}
  function mobileRecord(){if(recordStarting||recording){toggleRecord();return;}if(busy)return;setRecordArmed(true);return beginRecording();}
  const anySolo = channels.some((c) => c.solo);
  const mixer = mixerOpen && /* @__PURE__ */ React.createElement("section", { className: "mixer-dock", style: void 0 }, resizeEnabled && dockStack && /* @__PURE__ */ React.createElement("div", { className: "height-resizer panel-height-resizer", role: "separator", "aria-label": "Resize Mixer height", "aria-orientation": "horizontal", onDoubleClick: () => resetHeight("mixer"), onPointerDown: (e) => resizePanel(e, "mixer") }), /* @__PURE__ */ React.createElement(HorizontalScroller, { className: "mixer-scroll" }, /* @__PURE__ */ React.createElement("div", { className: "mixer-canvas", style: { minWidth: mixerVisible.length * 84 } }, /* @__PURE__ */ React.createElement("div", { className: "mixer-strips" }, mixerVisible.map((ch,i)=><MixerStrip key={ch.id} ch={ch} i={i} context={mixerActions} volume={controlValue(ch,'volume',ch.volume)} pan={controlValue(ch,'pan',ch.pan||0)} separation={controlValue(ch,'stereoSeparation',stereoSeparation(ch))} left={playing?meters[ch.id+'.left']||0:0} right={playing?meters[ch.id+'.right']||0:0} selected={fxTrack.id===ch.id} dimmed={anySolo&&!ch.solo} recording={recording} options={mixerOptions.get(ch.id)||[]}/>), <button className="mixer-add-channel" aria-label="Add mixer channel" disabled={recording||busy||(p.mixerChannels?.length||0)>=MAX_TRACKS} onClick={addMixerChannel}><Plus size={15}/>Add Mixer Channel</button>), /* @__PURE__ */ React.createElement(MixerCables, { channels:mixerVisible, selected:fxTrack.id }))));
  const controls = !collapsed && /* @__PURE__ */ React.createElement("section", { className: "bottom-panel", style: void 0 }, resizeEnabled && dockStack && /* @__PURE__ */ React.createElement("div", { className: "height-resizer panel-height-resizer", role: "separator", "aria-label": "Resize Track Controls height", "aria-orientation": "horizontal", onDoubleClick: () => resetHeight("controls"), onPointerDown: (e) => resizePanel(e, "controls") }), /* @__PURE__ */ React.createElement("div", { className: "effects" }, /* @__PURE__ */ React.createElement("div", { className: "effects-heading" }, /* @__PURE__ */ React.createElement("div", { className: "effects-heading-actions" }, /* @__PURE__ */ React.createElement("button", { className: (fxTrack == null ? void 0 : fxTrack.bypass) ? "" : "active", "aria-label": "Toggle all channel effects", title: "Toggle all channel effects", "aria-pressed": !(fxTrack == null ? void 0 : fxTrack.bypass), onClick: () => changeTrack(fxTrack.id, { bypass: !fxTrack.bypass }) }, /* @__PURE__ */ React.createElement(Power, { size: 13 })), /* @__PURE__ */ React.createElement("button", { title: "Effects menu", "aria-expanded": effectsMenu, onClick: (e) => {
    var _a2, _b2;
    const rect = (_b2 = (_a2 = e == null ? void 0 : e.currentTarget) == null ? void 0 : _a2.getBoundingClientRect) == null ? void 0 : _b2.call(_a2);
    setEffectsMenu(effectsMenu ? false : { x: (rect == null ? void 0 : rect.left) || 190, y: Math.max(8, Math.min(window.innerHeight - 430, ((rect == null ? void 0 : rect.bottom) || 100) + 4)) });
  } }, /* @__PURE__ */ React.createElement(Menu, { size: 14 }))), /* @__PURE__ */ React.createElement("b", null, "Channel Effects")), effectsMenu && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "effects-menu-shade", onClick: () => setEffectsMenu(false) }), /* @__PURE__ */ React.createElement("div", { className: "effects-menu", role: "menu", style: { left: effectsMenu.x, top: effectsMenu.y, maxHeight:Math.max(120,window.innerHeight-effectsMenu.y-12) } }, <h3 className="effects-menu-title">Channel Effects Menu</h3>,<button disabled={!fxTrack||fxTrack.frozen||recording} onClick={e=>openEffectPicker(null,e)}><Plus size={13}/>Add effect</button>,<button disabled={!fxTrack?.effects?.length||recording||recordStarting||busy} onClick={()=>{setEffectsMenu(false);setEffectToRemove({kind:'all',channel:fxTrack.id,name:fxTrack.name});}}><X size={13}/>Delete All Effects</button>,<button disabled={!fxTrack?.effects?.length} onClick={()=>{const close=!fxTrack.effects.every(effect=>closedEffects[effect.id]);setClosedEffects(v=>({...v,...Object.fromEntries(fxTrack.effects.map(effect=>[effect.id,close]))}));}}>{fxTrack?.effects?.length&&fxTrack.effects.every(effect=>closedEffects[effect.id])?<ChevronDown size={13}/>:<ChevronUp size={13}/>}{fxTrack?.effects?.length&&fxTrack.effects.every(effect=>closedEffects[effect.id])?'Open All Effects Panel':'Close All Effects Panel'}</button>,<button disabled={!fxTrack||recording} onClick={savePreset}><Save size={13}/>Save preset</button>,<button disabled={!fxTrack||recording} onClick={()=>presetInput.current.click()}><FolderInput size={13}/>Load preset</button>,<div className="clip-edit-controls"><button title="Reverse selected clip" disabled={!clip||busy||recording||!editableTrack(p,clip.track)} aria-pressed={clip?.reversed||false} onClick={()=>transformClip(!clip.reversed,clip.pitch||0)}><RotateCcw size={12}/>Reverse clip</button></div>,<label className="stretch-mode">Time stretching<select aria-label="Time stretching mode" value={p.stretchMode||'resample'} disabled={busy||recording} onChange={e=>commit({...p,stretchMode:e.target.value})}><option value="resample">Resample</option><option value="stretch">Stretch</option></select></label>,<label className="clip-pitch-control">Pitch <output>{pitch>0?'+':''}{pitch} st</output><input aria-label="Selected clip pitch" type="range" min="-12" max="12" step="1" value={pitch} disabled={!clip||busy||recording||!editableTrack(p,clip.track)} onChange={e=>setPitch(+e.target.value)} onPointerUp={()=>{if(clip&&pitch!==(clip.pitch||0))transformClip(clip.reversed||false,pitch);}} onPointerCancel={()=>setPitch(clip?.pitch||0)} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.key)&&clip&&pitch!==(clip.pitch||0))transformClip(clip.reversed||false,pitch);}} onDoubleClick={()=>{setPitch(0);transformClip(clip?.reversed||false,0);}}/></label>,((_b = p.presets) == null ? void 0 : _b.length) > 0 && /* @__PURE__ */ React.createElement("select", { "aria-label": "Project effect presets", value: "", disabled: !fxTrack, onChange: (e) => {
    const preset = p.presets.find((x) => x.id === e.target.value);
    if (preset) setEffects(preset.effects.map((x) => ({ ...x, id: crypto.randomUUID() })));
  } }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Project presets"), p.presets.map((pr) => /* @__PURE__ */ React.createElement("option", { key: pr.id, value: pr.id }, pr.name))))), addFx && track && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "effect-picker-dismiss", onClick: () => setAddFx(false) }), <EffectPicker anchor={fxAnchor} entries={Object.entries(FX_NAMES).filter(([type])=>type!=='saturation').sort((a,b)=>a[1].localeCompare(b[1]))} onSelect={addEffect} onClose={()=>setAddFx(false)}/>), /* @__PURE__ */ React.createElement(HorizontalScroller, { className: "effect-rack " + (p.effectsBypass || (fxTrack == null ? void 0 : fxTrack.bypass) ? "bypassed" : "") }, !((_c = fxTrack == null ? void 0 : fxTrack.effects) == null ? void 0 : _c.length) && /* @__PURE__ */ React.createElement("p", { className: "rack-empty" }, "No effects. Add an effect to build your chain."), (_d = fxTrack == null ? void 0 : fxTrack.effects) == null ? void 0 : _d.map((effect, i) => /* @__PURE__ */ React.createElement(React.Fragment, { key: effect.id }, /* @__PURE__ */ React.createElement("button", { className: "effect-insert", title: i === 0 ? "Insert effect at start" : "Insert effect before " + FX_NAMES[effect.type], "aria-label": i === 0 ? "Insert effect at start" : "Insert effect before " + FX_NAMES[effect.type], disabled: fxTrack.frozen || recording, onClick: e => openEffectPicker(i,e) }, /* @__PURE__ */ React.createElement(Plus, { size: 12 })), /* @__PURE__ */ React.createElement("div", { className: "effect " + (effect.enabled && !p.effectsBypass && !(fxTrack == null ? void 0 : fxTrack.bypass) ? "enabled " : "") + (closedEffects[effect.id] ? "effect-closed " : "") + (reorderingFx === effect.id ? "effect-reordering" : ""), "data-effect-id": effect.id }, /* @__PURE__ */ React.createElement(EffectHeader, { name: FX_NAMES[effect.type], description: FX_DESCRIPTIONS[effect.type], enabled: effect.enabled, closed: !!closedEffects[effect.id], first: i === 0, last: i === fxTrack.effects.length - 1, onToggle: () => setEffects(fxTrack.effects.map((x) => x.id === effect.id ? { ...x, enabled: !x.enabled } : x)), onRemove: () => requestRemoveEffect(effect), onCollapse: () => setClosedEffects({ ...closedEffects, [effect.id]: !closedEffects[effect.id] }), onMoveLeft: () => moveEffect(effect.id, -1), onMoveRight: () => moveEffect(effect.id, 1), onNamePointerDown: (e) => beginEffectReorder(e, effect.id) }), !closedEffects[effect.id] && /* @__PURE__ */ React.createElement("div", { className: "effect-parameters" },STUDIO_EFFECTS[effect.type]&&<StudioEffectPanel effect={effect} channel={fxTrack.id} runtime={runtime} param={param} onChange={(key,value)=>effectValue(effect.id,key,value)}/>,effect.type==='autotune'&&<div className="autotune-panel"><div className="autotune-knobs">{[['Amount','tuningAmount'],['Speed','tuningSpeed']].map(([label,key])=><EffectKnob key={key} label={label} channel={fxTrack.id} param={'fx.'+effect.id+'.'+key} value={controlValue(track,'fx.'+effect.id+'.'+key,effect.params[key])} onChange={value=>effectValue(effect.id,key,value)} onReset={()=>effectValue(effect.id,key,100)}/>)}</div><KeySelector embedded note={p.key} scale={p.scale} onChange={(key,scale)=>commit({...p,key,scale})}/></div>,effect.type==='eq7'&&<ParametricEqPanel effect={effect} channel={fxTrack.id} runtime={runtime} assets={assets} clip={clip?.track===fxTrack.id?clip:p.clips.find(c=>c.track===fxTrack.id)} soloBand={eqAudition[effect.id]||0} onSolo={band=>soloEqBand(effect.id,band)} onEditStart={()=>beginEqEdit(effect.id)} onEditEnd={cancel=>endEqEdit(cancel)} onChange={changes=>changeEqParameters(fxTrack.id,effect.id,changes)}/>, effect.type === "eq" && /* @__PURE__ */ React.createElement(React.Fragment, null, param(effect, "Bass", "bass", -18, 18, 1, " dB"), param(effect, "Mid", "mid", -18, 18, 1, " dB"), param(effect, "Treble", "treble", -18, 18, 1, " dB")), ['compressor','reverb','delay'].includes(effect.type)&&<NativeEffectPanel effect={effect} channel={fxTrack.id} runtime={runtime} onChange={(key,value)=>effectValue(effect.id,key,value)}/>, effect.type === "gate" && param(effect, "Threshold", "gateThreshold", -80, -5, 1, " dB"), )))), /* @__PURE__ */ React.createElement("button", { className: "rack-add-effect", disabled: !fxTrack || fxTrack.frozen || recording, onClick: e => openEffectPicker(null,e) }, /* @__PURE__ */ React.createElement(Plus, { size: 18 }), "Add Effects"))));
  const tooltip = (!collapsed || mixerOpen) && /* @__PURE__ */ React.createElement("aside", { className: "channel-sidebar " + (helpClosed ? "closed" : "") }, /* @__PURE__ */ React.createElement("button", { className: "sidebar-collapse", title: helpClosed ? "Open message box" : "Close message box", "aria-expanded": !helpClosed, onClick: () => setHelpClosed(!helpClosed) }, /* @__PURE__ */ React.createElement("span", { className: "tooltip-toggle-icon" }, /* @__PURE__ */ React.createElement(SecretText, { text: helpClosed ? ">" : "<", drawing: helpClosed ? "arrow-right" : "arrow-left" }))), !helpClosed && /* @__PURE__ */ React.createElement("div", { className: "message-copy" }, /* @__PURE__ */ React.createElement("b", null, help.label), /* @__PURE__ */ help.text&&help.text.trim()!==help.label.trim()&&React.createElement("p", null, help.text)));
  const {mainControls,mainMixer,tooltipInPopup}=dockPresence(!collapsed,mixerOpen,mixerWindow?popupMode:null);
  const mainStacked = dockStack && !collapsed && mixerOpen && !(mixerWindow && popupMode);
  function dockPanels(location) {
    const detached = !!mixerWindow, showControls = !!controls && (location === "popup" ? popupMode === "controls" || popupMode === "both" : !(detached && (popupMode === "controls" || popupMode === "both"))), showMixer = !!mixer && (location === "popup" ? popupMode === "mixer" || popupMode === "both" : !(detached && (popupMode === "mixer" || popupMode === "both")));
    return /* @__PURE__ */ React.createElement("div", { className: "dock-panels " + (dockFlip ? "flipped " : "") + (dockStack ? "stacked" : "") + (location === "main" && mainStacked ? " stacked-grid" : ""), style: { "--dock-ratio": dockRatio + "%" } }, showControls && /* @__PURE__ */ React.createElement("div", { className: "dock-controls", style: { order: dockStack ? dockFlip ? 1 : 3 : dockFlip ? 3 : 1, ...dockStack ? { flexBasis: panelHeights.controls || 270 } : {}, ...location === "main" && mainStacked ? { gridRow: dockFlip ? 1 : 2, gridColumn: dockFlip ? "1 / -1" : 2 } : {} } }, controls), showControls && showMixer && !dockStack && /* @__PURE__ */ React.createElement("div", { className: "dock-width-resizer " + (!resizeEnabled ? "locked" : ""), style: { order: 2 }, role: resizeEnabled ? "separator" : void 0, "aria-disabled": !resizeEnabled, "aria-label": "Resize Track Controls and Mixer widths", "aria-orientation": "vertical", onPointerDown: resizeDock, onDoubleClick: () => {
      if (resizeEnabled) setDockRatio(52);
    } }), showMixer && /* @__PURE__ */ React.createElement("div", { className: "dock-mixer", style: { order: dockStack ? dockFlip ? 3 : 1 : dockFlip ? 1 : 3, ...dockStack ? { flexBasis: panelHeights.mixer || 260 } : {}, ...location === "main" && mainStacked ? { gridRow: dockFlip ? 2 : 1, gridColumn: dockFlip ? 2 : "1 / -1" } : {} } }, mixer));
  }
  return /* @__PURE__ */ React.createElement("div", { className: (mobile?"mobile-layout "+(mobileDockHidden?"playlist-focused ":""):"")+"app theme-" + theme + " workspace-" + workspace + " " + (recording ? "is-recording" : "") + (busy ? " is-busy" : "") + (recordStarting ? " is-counting" : ""), onClickCapture: (e) => {
    var _a2, _b2, _c2, _d2;
    if (playlistOptions && !((_b2 = (_a2 = e.target).closest) == null ? void 0 : _b2.call(_a2, ".playlist-options"))) setPlaylistOptions(false);
    if (menu && !((_d2 = (_c2 = e.target).closest) == null ? void 0 : _d2.call(_c2, '.main-menu,[aria-label="Main menu"]'))) setMenu(false);
  }, onContextMenu: controlContext, onMouseOver: describe, onFocus: describe, onInput:describeInput, onPointerDownCapture: (e) => {
    var _a2, _b2;
    if (automation && !((_b2 = (_a2 = e.target).closest) == null ? void 0 : _b2.call(_a2, ".automation-lane,.modal,[data-param],.automation-settings,.clip-edit-controls"))) setAutomation(null);
  } }, mobile && <MobileHeader project={p} onName={name=>commit({...p,name})} onMenu={()=>setMenu(!menu)} onSave={()=>requestSave()} busy={busy} time={countdown?String(countdown):stamp(cursor)} metro={metro} onMetro={()=>setMetro(!metro)} onBpm={bpm=>commit({...p,bpm})} onBpmDrag={dragBpm} onKey={(key,scale)=>commit({...p,key,scale})} audio={audio} device={device} recording={recording} recordStarting={recordStarting} rec={rec} onError={setStatus}/>, !mobile && /* @__PURE__ */ React.createElement("header", null, /* @__PURE__ */ React.createElement("button", { title: "Main menu", disabled: recordStarting, "aria-label": "Main menu", "aria-expanded": menu, onClick: () => setMenu(!menu) }, /* @__PURE__ */ React.createElement(Menu, { size: 21 })), /* @__PURE__ */ <div className="studio-brand"><div className="brand-icon"><StudioLogo size={31}/></div><div className="studio-brand-copy"><b>{STUDIO_NAME}</b><span className="alpha-badge">ALPHA</span></div><div className="header-alpha-warning"><TriangleAlert size={15}/><span>Tabrec Studio is in Alpha. Bugs will happen.</span></div></div>, /* @__PURE__ */ React.createElement("div", { className: "project-title" }, /* @__PURE__ */ React.createElement("input", { "aria-label": "Project name", value: p.name, onChange: (e) => commit({ ...p, name: e.target.value }) }), /* @__PURE__ */ React.createElement("span", null, dirty ? "Unsaved changes" : "All changes saved locally", " · Last saved: ", p.lastSaved ? new Date(p.lastSaved).toLocaleTimeString() + " (" + Math.max(0, Math.floor((saveClock - p.lastSaved) / 3e5) * 5) + " minutes ago)" : "Never")), <div className="header-actions"><IconButton className="save-project" title="Quick Save" icon={Save} disabled={busy||recording||recordStarting} onClick={()=>requestSave()}>Quick Save</IconButton>{React.createElement(IconButton, { className: "fullscreen-toggle", title: fullscreen ? "Exit fullscreen" : "Enter fullscreen", "aria-label": "Toggle fullscreen", "aria-pressed": fullscreen, icon: fullscreen ? Minimize : Maximize, onClick: toggleFullscreen })}</div>), menu && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "menu-shade", onClick: () => setMenu(false) }), /* @__PURE__ */ React.createElement("nav", { className: "main-menu" },<h2 className="main-menu-title">Main Menu Settings</h2>,<button disabled={recording||busy} onClick={()=>{pendingTemplate.current='default';setDialog('new');setMenu(false);}}>New Project</button>,<button disabled={recording||busy} onClick={()=>{openProject();setMenu(false);}}>Open Project</button>,<button disabled={recording||busy} onClick={()=>{requestSave(false,true);setMenu(false);}}>Save Project</button>,<button disabled={recording||busy} onClick={()=>{requestSave(true);setMenu(false);}}>Save Project as...</button>,<button disabled={recording||busy||p.tracks.length>=MAX_TRACKS} onClick={()=>{importTarget.current=null;importInput.current.click();setMenu(false);}}>Import</button>,<button disabled={recording||busy} onClick={()=>{setExportTarget(null);setExportChoices(['wav-24']);if(!p.loop.enabled)setExportScope('full');setDialog('export');setMenu(false);}}>Export</button>,/* @__PURE__ */ React.createElement("button", { disabled: recording || recordStarting || busy, onClick: openTools }, "Tools"), /* @__PURE__ */ React.createElement("button", { onClick: async () => {
    setSettings(true);
    setMenu(false);
    try {
      setDevices((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput"));
    } catch (e) {
      setStatus(e.message);
    }
  } }, "Settings"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setMenu(false);
    setAboutOpen(true);
  } }, "About"))), /* @__PURE__ */ !mobile && React.createElement(TransportLayout, null, /* @__PURE__ */ React.createElement("div", { className: "tools-left" }, /* @__PURE__ */ React.createElement("div", { className: "zoom" }, /* @__PURE__ */ React.createElement(IconButton, { title: "Zoom out", icon: ZoomOut, onClick: () => setZoom((z) => Math.max(ZOOM_MIN, z / 1.4)) }), /* @__PURE__ */ React.createElement(ZoomCounter, { zoom, onChange: setZoom }), /* @__PURE__ */ React.createElement(IconButton, { title: "Zoom in", icon: ZoomIn, onClick: () => setZoom((z) => Math.min(ZOOM_MAX, z * 1.4)) }), /* @__PURE__ */ React.createElement(IconButton, { title: "Snap to grid", "aria-pressed": p.snap, icon: Magnet, className: p.snap ? "active" : "", onClick: () => commit({ ...p, snap: !p.snap }) }), /* @__PURE__ */ React.createElement("div", { className: "playlist-options" }, /* @__PURE__ */ React.createElement("button", { title: "Playlist options", "aria-label": "Playlist options", "aria-expanded": playlistOptions, onClick: () => setPlaylistOptions(!playlistOptions) }, /* @__PURE__ */ React.createElement(ThemedIcon, { name: "playlist-options", Fallback: AudioLines, size: 15 })), playlistOptions && /* @__PURE__ */ React.createElement("div", { className: "playlist-options-menu", role: "menu", "aria-label": "Playlist options menu" }, <h3 className="popover-title">Playlist Options</h3>, <label>Grid<select aria-label="Playlist grid" value={p.gridDivision||16} onChange={e=>commit({...p,gridDivision:+e.target.value})}>{[4,8,16,32].map(n=><option value={n} key={n}>1/{n}</option>)}</select></label>, [["showFades", "Show fade editing controls"], ["zeroCrossing", "Add zero-crossing when editing audio clips"], ["stretch", "Stretch audio when resizing clips"]].map(([key, label]) => {
    var _a2, _b2;
    return /* @__PURE__ */ React.createElement("label", { key }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", "aria-label": label, checked: key === "zeroCrossing" ? ((_a2 = p.editOptions) == null ? void 0 : _a2[key]) !== false : !!((_b2 = p.editOptions) == null ? void 0 : _b2[key]), onChange: (e) => commit({ ...p, editOptions: { ...p.editOptions, [key]: e.target.checked } }) }), label);
  }), /* @__PURE__ */ React.createElement("button", { onClick: () => openMarker() }, <Flag size={13}/>, "Add marker at playhead")))), /* @__PURE__ */ React.createElement("div", { className: "edit-tools" }, /* @__PURE__ */ React.createElement(IconButton, { title: "Undo", icon: Undo2, disabled: !history.undo.length || recording, onClick: () => undo() }), /* @__PURE__ */ React.createElement(IconButton, { title: "Redo", icon: Redo2, disabled: !history.redo.length || recording, onClick: () => undo(true) }), /* @__PURE__ */ React.createElement(IconButton, { title: "Cut / split at playhead", icon: Scissors, disabled: !clip || recording, onClick: () => edit("split") }), /* @__PURE__ */ React.createElement(IconButton, { title: "Duplicate clip", icon: Copy, disabled: !clip || recording, onClick: () => edit("duplicate") }), /* @__PURE__ */ React.createElement(IconButton, { title: "Delete clip", icon: Trash2, disabled: !clip || recording, onClick: () => edit("delete") }))), /* @__PURE__ */ React.createElement("div", { className: "tempo-tools" }, /* @__PURE__ */ React.createElement(BpmCounter, { value: playing ? tempoAt(p, cursor) : p.bpm, onAutomate: beginTempoAutomation, disabled: recording || recordStarting, onDrag: dragBpm, onChange: (bpm) => commit({ ...p, bpm }) }), /* @__PURE__ */ React.createElement("span", { className: "signature-control" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Time signature", value: p.signature, disabled: recording, onChange: (e) => commit({ ...p, signature: e.target.value }) }, ["2/4", "3/4", "4/4", "5/4", "6/8", "7/8", "9/8", "12/8"].map((v) => /* @__PURE__ */ React.createElement("option", { key: v }, v))), /* @__PURE__ */ React.createElement("span", { className: "signature-drawing" }, /* @__PURE__ */ React.createElement(SecretText, { text: p.signature }))), /* @__PURE__ */ React.createElement(KeySelector, { note: p.key, scale: p.scale, onChange: (key, scale) => commit({ ...p, key, scale }) }), /* @__PURE__ */ React.createElement("button", { title: "Toggle metronome", "aria-pressed": metro, className: metro ? "active" : "", onClick: () => setMetro(!metro) }, /* @__PURE__ */ React.createElement(ThemedIcon, { name: "metronome", Fallback: MetronomeIcon, size: 16 })), /* @__PURE__ */ React.createElement("button", { title: "Tap tempo", disabled: recording || recordStarting, onClick: tapTempo }, /* @__PURE__ */ React.createElement(SecretText, { text: "Tap", drawing: "tap" })), /* @__PURE__ */ React.createElement("button", { title: "3-second recording count-in", "aria-label": "3-second recording count-in", "aria-pressed": countIn, className: countIn ? "active" : "", disabled: recording || recordStarting, onClick: () => setCountIn(!countIn) }, /* @__PURE__ */ React.createElement(ThemedIcon, { name: "count-in", Fallback: Timer, size: 16 })), /* @__PURE__ */ React.createElement("button", { title: "Auto-scroll timeline", "aria-label": "Auto-scroll timeline", "aria-pressed": autoScroll, className: autoScroll ? "active" : "", onClick: () => setAutoScroll(!autoScroll) }, /* @__PURE__ */ React.createElement(ThemedIcon, { name: "auto-scroll", Fallback: ArrowRightToLine, size: 16 }))), /* @__PURE__ */ React.createElement("div", { className: "center-transport" }, <button className="quick-retake" title="Quick Retake" disabled={busy||recordStarting||(!recording&&(!recordingBuffer.current||!p.clips.some(c=>c.id===recordingBuffer.current.take.id)))} onClick={quickRetake}><Repeat2 size={14}/><span>Retake</span></button>, /* @__PURE__ */ React.createElement(IconButton, { title: playing ? "Pause" : "Play", icon: playing ? Pause : Play, className: playing ? "active" : "", disabled: recordStarting, onClick: playTransport }), /* @__PURE__ */ React.createElement(IconButton, { title: "Stop", icon: Square, onClick: stop }), /* @__PURE__ */ React.createElement(IconButton, { title: "Record", "aria-label": recordArmed ? "Recording armed" : "Arm recording", "aria-pressed": recordArmed, icon: RecordIcon, iconSize: 16, className: recording ? "recording" : recordArmed ? "record record-armed" : "record", disabled: busy, onClick: toggleRecord }), /* @__PURE__ */ React.createElement(IconButton, { title: "Loop", "aria-pressed": p.loop.enabled, icon: Repeat2, className: p.loop.enabled ? "active" : "", disabled: recording || recordStarting, onClick: () => commit({ ...p, loop: { ...p.loop, enabled: !p.loop.enabled } }) }), /* @__PURE__ */ React.createElement("div", { className: "time " + (recording && playing ? "recording-time" : "") }, /* @__PURE__ */ React.createElement("strong", { "aria-live": countdown ? "polite" : "off" }, /* @__PURE__ */ React.createElement(SecretText, { text: countdown ? countdown : stamp(cursor) }))), <MicrophoneMeter audio={audio} device={device} recording={recording} recordStarting={recordStarting} rec={rec} onError={setStatus}/>), ), /* @__PURE__ */ React.createElement("main", null, /* @__PURE__ */ React.createElement("div", { className: "playlist-area" }, /* @__PURE__ */ React.createElement("div", { className: "arrangement", tabIndex: mobile?0:void 0, "aria-label":mobile?"Playlist":void 0, onPointerDownCapture:focusMobilePlaylist, onFocusCapture:focusMobilePlaylist, onDragOver: (e) => e.preventDefault(), onDrop: (e) => {
    e.preventDefault();
    if(!recording&&!busy){const lane=e.target?.closest?.('[data-track-lane]');importFiles([...e.dataTransfer.files],lane?.dataset.trackLane||null,lane?Math.max(0,(e.clientX-lane.getBoundingClientRect().left)/zoom):position.current);}
  } }, /* @__PURE__ */ React.createElement("div", { className: "arrangement-content", style:{"--track-header-width":(mobile?100:headerResize.width)+"px","--header-scale":mobile?1:headerResize.width/240} }, /* @__PURE__ */ React.createElement("aside", { className: "track-list" }, /* @__PURE__ */ React.createElement("div", { className: "track-heading", style: { height: 34 + markerHeight } }), rows.map((row) => row.kind === "master" ? <MasterAutomationHeader key="master-automation" project={p} height={row.height} onChange={commit}/> : row.kind === "tempo" ? /* @__PURE__ */ React.createElement("div", { className: "tempo-track-header", key: "tempo", style: { height: row.height } }, /* @__PURE__ */ React.createElement("button", { title: "Resize BPM automation", onClick: () => commit({ ...p, tempoLaneCollapsed: !p.tempoLaneCollapsed }) }, p.tempoLaneCollapsed ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 12 }) : /* @__PURE__ */ React.createElement(ChevronUp, { size: 12 })), /* @__PURE__ */ React.createElement("b", null, "BPM automation"), /* @__PURE__ */ React.createElement("small", null, tempoAt(p, cursor).toFixed(0)), /* @__PURE__ */ React.createElement("button", { title: "Delete BPM automation", onClick: () => commit({ ...p, tempoLaneVisible: false, tempoAutomation: [] }) }, /* @__PURE__ */ React.createElement(X, { size: 12 }))) : row.kind === "group" ? /* @__PURE__ */ React.createElement("div", { className: "group-header", key: row.group.id, style: { height: row.height } }, /* @__PURE__ */ React.createElement("button", { title: "Collapse group " + row.group.name, onClick: () => setGroup(row.group.id, { collapsed: !row.group.collapsed }) }, row.group.collapsed ? "▸" : "▾"), /* @__PURE__ */ React.createElement("b", null, row.group.name), /* @__PURE__ */ React.createElement("button", { title: "Remove group", onClick: () => commit({ ...p, groups: p.groups.filter((g) => g.id !== row.group.id), tracks: p.tracks.map((t2) => t2.group === row.group.id ? { ...t2, group: null } : t2) }) }, "×"), /* @__PURE__ */ React.createElement("button", { title: "Move group up", onClick: () => moveGroup(row.group.id, -1) }, "↑"), /* @__PURE__ */ React.createElement("button", { title: "Move group down", onClick: () => moveGroup(row.group.id, 1) }, "↓")) : (() => {
    const t2 = row.track, i = p.tracks.indexOf(t2);
    return /* @__PURE__ */ React.createElement("div", { key: t2.id, className: "track-row " + (t2.collapsed ? "compact " : "") + (t2.group ? "grouped " : "") + (t2.mute ? "muted-track " : "") + (anySolo && !t2.solo ? "solo-dimmed " : "") + (track.id === t2.id ? "selected" : ""), style: { height: row.height, "--track": t2.color || COLORS[i % COLORS.length] }, onClick: () => setSelected(t2.id) }, /* @__PURE__ */ React.createElement("div", { className: "track-label" }, /* @__PURE__ */ React.createElement("button", { title: "Resize " + t2.name, "aria-expanded": !t2.collapsed, onClick: (e) => {
      e.stopPropagation();
      changeTrack(t2.id, { collapsed: !t2.collapsed });
    } }, t2.collapsed ? <ChevronDown size={12}/> : <ChevronUp size={12}/>), /* @__PURE__ */ React.createElement(InlineName, { className: "track-name", label: "Rename " + t2.name, value: t2.name, onChange: (name) => changeTrack(t2.id, { name }), requestEdit: renaming === t2.id, onFinish: () => setRenaming(null) }), /* @__PURE__ */ React.createElement("span", { className: "track-automation-slot" },t2.frozen&&<span title="Frozen track"><Snowflake size={12}/></span>, enabledAutomations(t2).length > 0 && /* @__PURE__ */ React.createElement("button", { className: "track-automation-button", title: "Automations for " + t2.name, onClick: (e) => openAutomationMenu(e, t2.id) }, /* @__PURE__ */ React.createElement(Workflow, { size: 12 }))), /* @__PURE__ */ React.createElement("button", { title: "Select for recording", "aria-pressed": recordTargets.length?recordTargets.includes(t2.id):track.id===t2.id, className: (recordTargets.length?recordTargets.includes(t2.id):track.id===t2.id) ? "arm armed" : "arm", disabled: recording||recordStarting||t2.frozen||t2.locked, onClick: e => selectRecordingTrack(e,t2.id) }, /* @__PURE__ */ React.createElement(Mic, { size: 12 })), /* @__PURE__ */ React.createElement("button", { className: (trackMenu == null ? void 0 : trackMenu.id) === t2.id ? "settings-open" : "", title: "Settings for " + t2.name, onClick: (e) => showTrackMenu(e, t2.id) }, /* @__PURE__ */ React.createElement(Settings2, { size: 13 }))), mobile&&!t2.collapsed&&<MixerTargetControl className="mobile-mixer-target" label={"Target mixer for "+t2.name} value={targetIndex(p,t2)} disabled={recording||busy||t2.locked||t2.frozen} onChange={index=>setMixerTarget(t2.id,index)}/>, mobile && <button className="mobile-track-fx" aria-label={'Effects for '+t2.name} onClick={e=>{e.stopPropagation();setSelected(t2.id);setMobileDockHidden(false);setCollapsed(false);setMixerOpen(false);}}>FX</button>, !t2.collapsed && /* @__PURE__ */ React.createElement("div", { className: "track-controls" }, <MixerTargetControl label={"Target mixer for "+t2.name} value={targetIndex(p,t2)} disabled={recording||busy||t2.locked||t2.frozen} onChange={index=>setMixerTarget(t2.id,index)}/>, /* @__PURE__ */ React.createElement(Knob, { channel: t2.id, label: t2.name + " pan", value: controlValue(t2, "pan", t2.pan), onChange: (pan) => changeTrack(t2.id, { pan }) }), /* @__PURE__ */ <TrackVolume track={t2} value={controlValue(t2,'volume',t2.volume)} left={meters[t2.id+'.left']} right={meters[t2.id+'.right']} onChange={volume=>changeTrack(t2.id,{volume})} onReset={()=>changeTrack(t2.id,{volume:1})}/>, /* @__PURE__ */ React.createElement("small", null, t2.volume ? (20 * Math.log10(t2.volume)).toFixed(1) : "-∞", " dB")), /* @__PURE__ */ React.createElement("div", { className: "track-activity-corner" },t2.locked&&<span title="Locked track"><Lock size={12}/></span>, /* @__PURE__ */ React.createElement(ChannelDot, { name: t2.name, muted: t2.mute, solo: t2.solo, disabled: recording, onMute: () => changeTrack(t2.id, { mute: !t2.mute }), onSolo: () => soloMixerChannel(t2.id), onAddSolo:()=>additiveSolo(t2.id) })), resizeEnabled && !t2.collapsed && /* @__PURE__ */ React.createElement("div", { className: "height-resizer track-height-resizer", role: "separator", "aria-label": "Resize height " + t2.name, "aria-orientation": "horizontal", onDoubleClick: (e) => {
      e.stopPropagation();
      resetHeight("tracks", t2.id);
    }, onPointerDown: (e) => resizePanel(e, "tracks", t2.id) }));
  })()), /* @__PURE__ */ React.createElement("div", { className: "track-add-actions" }, /* @__PURE__ */ React.createElement("button", { disabled: busy || recording || p.tracks.length >= MAX_TRACKS, onClick: addTrack }, /* @__PURE__ */ React.createElement(Plus, { size: 14 }), "Add Track"), /* @__PURE__ */ React.createElement("button", { disabled: busy || recording || p.tracks.length >= MAX_TRACKS, onClick: () => {
    importTarget.current = null;
    importInput.current.click();
  } }, "Import File"))), /* @__PURE__ */ <div className={'track-width-resizer '+(headerResize.locked?'locked':'')} role="separator" aria-label="Resize track headers" aria-orientation="vertical" aria-valuemin={180} aria-valuemax={480} aria-valuenow={headerResize.width} aria-disabled={headerResize.locked} tabIndex={headerResize.locked?-1:0} onPointerDown={headerResize.begin} onKeyDown={headerResize.key} onDoubleClick={headerResize.reset}/>, React.createElement("div", { className: "timeline-scroll", ref: timeline, onScroll: (e) => setTimelineView({ left: e.currentTarget.scrollLeft, width: e.currentTarget.clientWidth }) }, /* @__PURE__ */ React.createElement("div", { className: "timeline", onPointerDownCapture:beginSelection, style: { width, minHeight: Math.max(220, timelineHeight) } }, /* @__PURE__ */ React.createElement("div", { className: "ruler", onPointerDown: (e) => {
    if (e.detail < 2) selectLoop(e);
  }, onDoubleClick: (e) => {
    var _a2;
    if (!((_a2 = p.markers) == null ? void 0 : _a2.length)) return;
    e.preventDefault();
    openMarker(null, Math.max(0, (e.clientX - e.currentTarget.getBoundingClientRect().left) / zoom));
  } }, p.loop.enabled&&<React.Fragment><div className="ruler-loop-highlight" style={{left:p.loop.start*zoom,width:(p.loop.end-p.loop.start)*zoom}}/>{['start','end'].map(edge=><button className={'loop-boundary '+edge} key={edge} aria-label={'Loop '+edge} disabled={recording||recordStarting} style={{left:p.loop[edge]*zoom}} onPointerDown={e=>dragLoopBoundary(e,edge)} onDoubleClick={e=>e.stopPropagation()}/>)}</React.Fragment>,<i className="ruler-playhead" aria-hidden="true" style={{left:cursor*zoom}}/>, Array.from({ length: Math.ceil(width / (zoom * (mobile?60/p.bpm*Number(p.signature.split("/")[0]):2))) }, (_, i) => /* @__PURE__ */ React.createElement("span", { key: i, style: { left: i * zoom * (mobile?60/p.bpm*Number(p.signature.split("/")[0]):2) } }, mobile?String(i+1):stamp(i * 2).slice(0, 5)))), ((_e = p.markers) == null ? void 0 : _e.length) > 0 && /* @__PURE__ */ React.createElement("div", { className: "marker-strip", style: { height: markerHeight }, onDoubleClick: (e) => {
    if (e.target === e.currentTarget) openMarker(null, Math.max(0, (e.clientX - e.currentTarget.getBoundingClientRect().left) / zoom));
  } }, p.markers.map((marker) => /* @__PURE__ */ React.createElement("button", { key: marker.id, className: "playlist-marker", "data-locked": !!marker.locked, title: marker.name + (marker.locked ? " · Locked" : "") + " · Drag to move · Double-click to loop · Right-click to edit", style: { left: marker.time * zoom }, disabled: recording || recordStarting, onPointerDown: (e) => dragMarker(e, marker), onClick: (e) => {
    e.stopPropagation();
    if (Date.now() >= suppressMarkerClick.current) seek(marker.time);
  }, onDoubleClick: (e) => {
    e.preventDefault();
    e.stopPropagation();
    selectMarkerRange(marker.id);
  }, onContextMenu: (e) => {
    e.preventDefault();
    e.stopPropagation();
    openMarker(marker);
  } }, marker.locked && /* @__PURE__ */ React.createElement(Lock, { size: 10 }), marker.name))), p.loop.enabled && /* @__PURE__ */ React.createElement("div", { className: "loop-region", style: { left: p.loop.start * zoom, width: (p.loop.end - p.loop.start) * zoom } }, /* @__PURE__ */ React.createElement("span", null, "LOOP")), rows.map((row) => row.kind === "master" ? <MasterAutomationLane key="master-automation" project={p} height={row.height} width={width} zoom={zoom} snap={grid} onChange={commit} onInspect={inspectAutomation}/> : row.kind === "tempo" ? /* @__PURE__ */ React.createElement("div", { className: "tempo-lane", key: "tempo", style: { height: row.height } }, /* @__PURE__ */ React.createElement(AutomationLane, { points: p.tempoAutomation || [], defaultValue: p.bpm, min: 30, max: 300, value: p.bpm, label: "BPM · Double-click to add points", width, zoom, height: row.height, onChange: (points) => commit({ ...p, tempoAutomation: points }), snap: grid, onInspect: (value) => inspectAutomation(value, automation == null ? void 0 : automation.label) })) : row.kind === "group" ? /* @__PURE__ */ React.createElement("div", { key: row.group.id, className: "group-lane", style: { height: row.height } }, row.group.name) : (() => {
    var _a2, _b2, _c2, _d2, _e2;
    const t2 = row.track, i = p.tracks.indexOf(t2), showAuto = automation && automation.channel !== "tempo" && automation.channel!=='master' && (automation.channel === t2.id || !p.tracks.some((c) => c.id === automation.channel) && ((_a2 = rows.find((r) => r.kind === "track" && (r.track.mixerTarget===automation.channel||!p.mixerChannels?.some(c=>c.id===automation.channel)))) == null ? void 0 : _a2.track.id) === t2.id), autoChannel = automation && channels.find((c) => c.id === automation.channel);
    return /* @__PURE__ */ React.createElement("div", { "data-track-lane":t2.id,className: "lane " + (t2.collapsed ? "compact " : "") + (t2.group ? "grouped " : "") + (showAuto ? "automating " : "") + (t2.mute ? "muted-lane " : "") + (track.id === t2.id ? "selected" : ""), key: t2.id, style: { height: row.height, backgroundImage: ((_b2 = p.tempoAutomation) == null ? void 0 : _b2.length) ? "none" : void 0, backgroundSize: 60 / p.bpm / ((p.gridDivision||16)/4) * zoom + "px 100%" }, onPointerDown: (e) => {
      if (e.target === e.currentTarget) {
        if(e.shiftKey&&clip&&editableTrack(p,t2.id)&&editableTrack(p,clip.track)){const next=moveSelection(p,[clip.id],grid((e.clientX-e.currentTarget.getBoundingClientRect().left)/zoom)-clip.start,p.tracks.findIndex(x=>x.id===t2.id)-p.tracks.findIndex(x=>x.id===clip.track));commit({...next,clips:resolveClipPriority(next.clips,[clip.id],clip.id)});project.current=next;drag(e,next.clips.find(c=>c.id===clip.id),'move');return;}
        setSelectedClips([]);setSelected(t2.id);
        setClipId(null);
        setAutomation(null);
        seek(grid((e.clientX - e.currentTarget.getBoundingClientRect().left) / zoom));
      }
    } }, p.clips.filter((c) => c.track === t2.id).map((cl) => {
      var _a3, _b3;
      return /* @__PURE__ */ React.createElement("div", { key: cl.id, "data-clip-id": cl.id, className: "audio-clip " + (clipId === cl.id||selectedClips.includes(cl.id) ? "chosen " : "") + (movingClip === cl.id ? "moving-clip" : ""), style: { left: cl.start * zoom, width: Math.max(8, cl.duration * zoom), "--clip": t2.color || COLORS[i % COLORS.length] }, onPointerDown: (e) => drag(e, cl, "move") }, /* @__PURE__ */ React.createElement("div", { className: "clip-name" }, /* @__PURE__ */ React.createElement(Activity, { size: 11 }), cl.name), /* @__PURE__ */ React.createElement(Wave, { key: revision, zoom, view: timelineView, clipStart: cl.start, visualDuration: cl.duration, buffer: (_a3 = assets.current.get(cl.asset)) == null ? void 0 : _a3.buffer, offset: cl.offset, duration: cl.previewDuration || cl.duration, fadeIn: cl.fadeIn || 0, fadeOut: cl.fadeOut || 0, gainDb: cl.gainDb === null ? null : cl.gainDb ?? 0, color: t2.color || COLORS[i % COLORS.length] }), /* @__PURE__ */ React.createElement("div", { className: "trim left", onPointerDown: (e) => drag(e, cl, "left") }), /* @__PURE__ */ React.createElement("div", { className: "trim right", onPointerDown: (e) => drag(e, cl, "right") }), ((_b3 = p.editOptions) == null ? void 0 : _b3.showFades) && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "clip-gain-handle", "aria-label": "Clip gain " + cl.name, title: (cl.gainDb === null ? "Silence" : ((cl.gainDb ?? 0) > 0 ? "+" : "") + (cl.gainDb ?? 0).toFixed(1) + " dB") + " · Drag vertically · Double-click to reset", role: "slider", "aria-valuemin": -97, "aria-valuemax": 36, "aria-valuenow": cl.gainDb === null ? -97 : cl.gainDb ?? 0, "aria-valuetext": cl.gainDb === null ? "Silence" : (cl.gainDb ?? 0).toFixed(1) + " dB", style: { left: clipGainHandleX(cl, zoom, timelineView) }, onPointerDown: (e) => dragClipGain(e, cl), onDoubleClick: (e) => {
        e.stopPropagation();
        setClipGain(cl.id, 0);
      }, onKeyDown: (e) => {
        if (["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          setClipGain(cl.id, e.key === "Home" ? 0 : e.key === "End" ? null : Math.max(-96, Math.min(36, (cl.gainDb === null ? -96 : cl.gainDb ?? 0) + (e.key === "ArrowUp" ? 1 : -1))));
        }
      } }, /* @__PURE__ */ React.createElement("span", null, cl.gainDb === null ? "−∞" : (cl.gainDb ?? 0).toFixed(1) + " dB")), /* @__PURE__ */ React.createElement("svg", { className: "fade-shape", viewBox: "0 0 100 100", preserveAspectRatio: "none" }, /* @__PURE__ */ React.createElement("polygon", { className: "fade-shading", points: "0,0 " + (cl.fadeIn || 0) / cl.duration * 100 + ",0 0,100" }), /* @__PURE__ */ React.createElement("polygon", { className: "fade-shading", points: 100 - (cl.fadeOut || 0) / cl.duration * 100 + ",0 100,0 100,100" }), /* @__PURE__ */ React.createElement("polyline", { points: "0,100 " + (cl.fadeIn || 0) / cl.duration * 100 + ",0 " + (100 - (cl.fadeOut || 0) / cl.duration * 100) + ",0 100,100", fill: "none", stroke: "currentColor", vectorEffect: "non-scaling-stroke" })), /* @__PURE__ */ React.createElement("div", { className: "fade-handle", title: "Fade in · drag right", style: { left: Math.max(1, (cl.fadeIn || 0) / cl.duration * 100) + "%" }, onPointerDown: (e) => drag(e, cl, "fadeIn") }), /* @__PURE__ */ React.createElement("div", { className: "fade-handle out", title: "Fade out · drag left", style: { right: Math.max(1, (cl.fadeOut || 0) / cl.duration * 100) + "%" }, onPointerDown: (e) => drag(e, cl, "fadeOut") })));
    }), showAuto && autoChannel && /* @__PURE__ */ React.createElement(AutomationLane, { points: ((_c2 = autoChannel.automation) == null ? void 0 : _c2[automation.param]) || [], defaultValue: automationBase(autoChannel, automation.param), min: automation.min, max: automation.max, value: automation.value, label: autoChannel.name + " · " + automation.label, width, zoom, height: row.height, onChange: updateAutomation, snap: grid, onInspect: (value) => inspectAutomation(value, automation == null ? void 0 : automation.label) }), " ", recording && track.id === t2.id && /* @__PURE__ */ React.createElement("div", { className: "record-clip", style: { top: t2.collapsed ? 4 : 10, height: t2.collapsed ? 31 : row.height - 20, left: (((_d2 = runtime.current) == null ? void 0 : _d2.from) || 0) * zoom, width: Math.max(8, (cursor - (((_e2 = runtime.current) == null ? void 0 : _e2.from) || 0)) * zoom) } }, "Recording…"));
  })()), /* @__PURE__ */ React.createElement("div", { className: "bar-bands", "aria-hidden": "true" }, fourBarBands(p, zoom, timelineView).map((band) => /* @__PURE__ */ React.createElement("div", { className: "four-bar-shade", key: band.group, style: { left: band.left, width: band.width, top: 34 + markerHeight, height: timelineHeight - 34 - markerHeight } }))), ((_f = p.tempoAutomation) == null ? void 0 : _f.length) > 0 && /* @__PURE__ */ React.createElement(TempoGrid, { project: p, zoom, left: timelineView.left, width: timelineView.width || 1100, height: timelineHeight }), /* @__PURE__ */ <React.Fragment>{selectionBox&&<div className="playlist-selection" aria-label="Clip selection range" style={{left:selectionBox.start*zoom,width:(selectionBox.end-selectionBox.start)*zoom,top:selectionBox.top,height:selectionBox.bottom-selectionBox.top}}/>}</React.Fragment>,React.createElement("div", { className: "playhead", style: { left: cursor * zoom } }, /* @__PURE__ */ React.createElement("span", null)), !p.tracks.length && /* @__PURE__ */ React.createElement("div", { className: "empty" }, /* @__PURE__ */ React.createElement(Activity, { size: 32 }), /* @__PURE__ */ React.createElement("h2", null, "Your session starts here."), /* @__PURE__ */ React.createElement("p", null, "Drop MP3 / WAV files here, use Add Track or Import File, or press Record."), /* @__PURE__ */ <div className="demo-options"><button onClick={demo} disabled={busy}>Demo <Play size={13}/></button></div>))))), /* @__PURE__ */ React.createElement(VisualizerRack, { open: visualizersOpen, onToggle: () => setVisualizersOpen(!visualizersOpen), runtime, context: ctx, theme })), /* @__PURE__ */ React.createElement("div", { className: "lower-dock " + (!mainMixer && !mainControls ? "dock-empty " : "") + (collapsed ? "controls-closed" : "") + (mixerOpen ? " mixer-visible" : "") + (dockStack ? " dock-stacked" : "") + (mainStacked ? " stack-layout" : ""), style: dockStack ? { height: (!collapsed ? panelHeights.controls || 270 : 0) + (mixerOpen ? panelHeights.mixer || 260 : 0), maxHeight: "calc(100dvh - 240px)", ...mainStacked ? { gridTemplateRows: (dockFlip ? panelHeights.controls || 270 : panelHeights.mixer || 260) + "fr " + (dockFlip ? panelHeights.mixer || 260 : panelHeights.controls || 270) + "fr" } : {} } : panelHeights.controls || panelHeights.mixer ? { height: Math.max(panelHeights.controls || 0, panelHeights.mixer || 0), maxHeight: "none" } : void 0 }, resizeEnabled && !dockStack && (!collapsed || mixerOpen) && /* @__PURE__ */ React.createElement("div", { className: "height-resizer shared-height-resizer", role: "separator", "aria-label": "Resize panels height", "aria-orientation": "horizontal", onPointerDown: (e) => resizePanel(e, "shared"), onDoubleClick: () => resetHeight("shared") }), !tooltipInPopup&&tooltip, dockPanels("main")), " ", /* @__PURE__ */ React.createElement("div", { className: "timeline-bottom" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("button", { "aria-expanded": !collapsed, onClick: () => setCollapsed(!collapsed) }, collapsed ? /* @__PURE__ */ React.createElement(ChevronUp, { size: 14 }) : /* @__PURE__ */ React.createElement(ChevronDown, { size: 14 }), "Track Controls"), /* @__PURE__ */ React.createElement("button", { "aria-pressed": mixerOpen, onClick: () => setMixerOpen(!mixerOpen) }, mixerOpen ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 14 }) : /* @__PURE__ */ React.createElement(ChevronUp, { size: 14 }), "Mixer"), /* @__PURE__ */ React.createElement("div", { className: "panel-popout-menu" }, /* @__PURE__ */ React.createElement("button", { title: "Panel Menu", "aria-label": "Panel Menu", "aria-expanded": popoutMenu, onClick: () => setPopoutMenu(!popoutMenu) }, /* @__PURE__ */ React.createElement(Menu, { size: 14 })), popoutMenu && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "popover-dismiss", onClick: () => setPopoutMenu(false) }), /* @__PURE__ */ React.createElement("div", { className: "panel-popout-options", role: "menu", "aria-label": "Panel popouts" }, <h3 className="popover-title">Panel Menu</h3>, /* @__PURE__ */ React.createElement("button", { onClick: () => popoutMixer("controls") }, /* @__PURE__ */ React.createElement(ExternalLink, { size: 13 }), "Track Controls Popout"), /* @__PURE__ */ React.createElement("button", { onClick: () => popoutMixer("mixer") }, /* @__PURE__ */ React.createElement(ExternalLink, { size: 13 }), "Mixer Popout"), /* @__PURE__ */ React.createElement("button", { onClick: () => popoutMixer("both") }, /* @__PURE__ */ React.createElement(ExternalLink, { size: 13 }), "Track Controls and Mixer Popout"), mixerWindow && /* @__PURE__ */ React.createElement("button", { onClick: () => popoutMixer("dock") }, /* @__PURE__ */ React.createElement(ExternalLink, { size: 13 }), "Dock panels"), /* @__PURE__ */ React.createElement("button", { "aria-pressed": dockFlip, onClick: () => {
    setDockFlip(!dockFlip);
    setPopoutMenu(false);
  } }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 13 }), "Flip Track Controls and Mixer"), /* @__PURE__ */ React.createElement("button", { "aria-pressed": dockStack, onClick: () => {
    setDockStack(!dockStack);
    setPopoutMenu(false);
  } }, /* @__PURE__ */ React.createElement(Layers, { size: 13 }), dockStack ? "Unstack Track Controls and Mixer" : "Stack Track Controls and Mixer"), /* @__PURE__ */ React.createElement("div", { className: "panel-menu-actions" }, /* @__PURE__ */ React.createElement("button", { "aria-pressed": !resizeEnabled, onClick: () => {
    setResizeEnabled(!resizeEnabled);
    setPopoutMenu(false);
  } }, /* @__PURE__ */ React.createElement(Lock, { size: 12 }), resizeEnabled ? "Lock Resizing" : "Unlock Resizing"), /* @__PURE__ */ React.createElement("button", { onClick: resetPanelLayout }, /* @__PURE__ */ React.createElement(RotateCcw, { size: 12 }), "Reset Panels"))))), /* @__PURE__ */ React.createElement("button", { onClick: () => setNotepadOpen(true) }, /* @__PURE__ */ React.createElement(FileText, { size: 13 }), "Notepad")))), mixerWindow && /* @__PURE__ */ React.createElement(MixerPopout, { popup: mixerWindow, theme, mode: popupMode, onClose: () => {
    popupRef.current = null;
    setMixerWindow(null);
    setPopupMode(null);
  } }, <div className="popup-workspace">{tooltipInPopup&&tooltip}{dockPanels("popup")}</div>), /* @__PURE__ */ React.createElement("div", { className: "sr-only", role: "status" }, busy ? "Working locally." : status), /could not|failed|unavailable|invalid|corrupt|maximum|unfreeze|feedback/i.test(status) && /* @__PURE__ */ React.createElement("div", { className: "status-alert", role: "alert" }, /* @__PURE__ */ React.createElement("span", null, status), /* @__PURE__ */ React.createElement("button", { "aria-label": "Dismiss message", onClick: () => setStatus("Ready when you are") }, /* @__PURE__ */ React.createElement(X, { size: 13 }))), automationMenu && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "popover-dismiss", onClick: () => setAutomationMenu(null) }), /* @__PURE__ */ React.createElement("div", { className: "anchored-menu automation-picker", role: "menu", "aria-label": "Track automations", style: { left: automationMenu.x, top: automationMenu.y } }, (() => {
    const ch = channels.find((c) => c.id === automationMenu.id);
    return ch && enabledAutomations(ch).map(([key]) => {
      const info = automationInfo(ch, key);
      return /* @__PURE__ */ React.createElement("button", { key, onClick: () => {
        setSelected(ch.id);
        setAutomation(info);
        setAutomationMenu(null);
        setCollapsed(false);
      } }, info.label);
    });
  })())), trackMenu && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "popover-dismiss", onClick: () => setTrackMenu(null) }), /* @__PURE__ */ React.createElement("div", { className: "track-menu anchored-menu", style: { left: trackMenu.x, top: trackMenu.y, maxHeight: Math.max(140, window.innerHeight - trackMenu.y - 8) } }, (() => {
    const t2 = p.tracks.find((x) => x.id === trackMenu.id);
    return t2 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "track-menu-scroll" },<h2 className="track-settings-heading">Track Settings</h2>, /* @__PURE__ */ React.createElement("div", { className: "track-settings-title" }, /* @__PURE__ */ React.createElement("h3", null, t2.name), /* @__PURE__ */ React.createElement("button", { className: "track-color-trigger", title: "Header color", "aria-label": "Header color", "aria-expanded": colorMenu, style: { background: t2.color || COLORS[0] }, onClick: () => setColorMenu(!colorMenu) })), colorMenu && /* @__PURE__ */ React.createElement("div", { className: "track-color-side", style: { position: "fixed", left: trackMenu.x + 260, right: "auto", top: trackMenu.y + 7 }, role: "menu", "aria-label": "Header colors" }, /* @__PURE__ */ React.createElement("div", { className: "color-swatches" }, COLORS.map((color) => /* @__PURE__ */ React.createElement("button", { key: color, "aria-label": "Set header color " + color, "aria-pressed": t2.color === color, title: color, style: { background: color }, onClick: () => changeTrack(t2.id, { color }) })), /* @__PURE__ */ React.createElement("label", { title: "Custom header color" }, /* @__PURE__ */ React.createElement("input", { "aria-label": "Track header color", type: "color", value: t2.color || COLORS[0], onChange: (e) => changeTrack(t2.id, { color: e.target.value }) })))), /* @__PURE__ */ React.createElement("button", { onClick: () => trackAction(t2, "rename") }, "Rename"), /* @__PURE__ */ React.createElement("button", { disabled: p.tracks.length >= MAX_TRACKS, onClick: () => trackAction(t2, "duplicate") }, "Duplicate"), /* @__PURE__ */ React.createElement("button", { disabled:t2.locked,onClick: () => trackAction(t2, "delete") }, "Delete"), /* @__PURE__ */ React.createElement("button", { disabled: t2.locked||p.tracks[0].id === t2.id, onClick: () => trackAction(t2, "up") }, "Move Up"), /* @__PURE__ */ React.createElement("button", { disabled: t2.locked||p.tracks.at(-1).id === t2.id, onClick: () => trackAction(t2, "down") }, "Move Down"), /* @__PURE__ */ React.createElement("button", { title: "Freeze audio", disabled: busy || recording, onClick: () => freezeTrack(t2) }, /* @__PURE__ */ React.createElement(Snowflake, { size: 13 }), t2.frozen ? "Unfreeze audio" : "Freeze audio"),<button aria-pressed={!!t2.locked} disabled={recording||recordStarting} onClick={()=>changeTrack(t2.id,{locked:!t2.locked})}><Lock size={13}/>{t2.locked?"Unlock Track":"Lock Track"}</button>, /* @__PURE__ */ React.createElement("button", { disabled: t2.frozen || t2.locked || busy || recording, onClick: () => {
      importTarget.current = t2.id;
      importInput.current.click();
      setTrackMenu(null);
    } }, /* @__PURE__ */ React.createElement(FolderInput, { size: 13 }), "Import file"), /* @__PURE__ */ React.createElement("button", { disabled: busy || recording || !p.tracks.some((source) => routePath(p, source.id).some((c) => c.id === t2.id) && p.clips.some((c) => c.track === source.id)), onClick: () => {
      setExportTarget(t2.id);
      setExportMode("mixdown");
      setExportChoices(['wav-24']);
      if (!p.loop.enabled) setExportScope("full");
      setDialog("export");
      setTrackMenu(null);
    } }, /* @__PURE__ */ React.createElement(FileOutput, { size: 13 }), "Export file"), /* @__PURE__ */ React.createElement("label", null, "Group", /* @__PURE__ */ React.createElement("select", { value: t2.group || "", onChange: (e) => groupTrack(t2.id, e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "No group"), p.groups.map((g) => /* @__PURE__ */ React.createElement("option", { key: g.id, value: g.id }, g.name)), /* @__PURE__ */ React.createElement("option", { value: "new" }, "Create new group…"))), /* @__PURE__ */ React.createElement("label", null, "Automations", /* @__PURE__ */ React.createElement("select", { "aria-label": "Track settings automations", value: "", disabled: !enabledAutomations(t2).length, onChange: (e) => {
      const info = automationInfo(t2, e.target.value);
      setSelected(t2.id);
      setAutomation(info);
      setTrackMenu(null);
      setCollapsed(false);
    } }, /* @__PURE__ */ React.createElement("option", { value: "" }, enabledAutomations(t2).length ? "Select automation" : "No active automations"), enabledAutomations(t2).map(([key]) => /* @__PURE__ */ React.createElement("option", { key, value: key }, automationInfo(t2, key).label)))), /* @__PURE__ */ React.createElement("label", null, "Route to", /* @__PURE__ */ React.createElement("select", { value: t2.output || "master", onChange: (e) => changeTrack(t2.id, { output: e.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "master" }, "Master"), channels.filter((c) => c.id !== "master" && canRoute(p, t2.id, c.id)).map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.name)))), <label>Target a mixer track<select aria-label={'Target a mixer track for '+t2.name} value={targetIndex(p,t2)} disabled={recording||busy||t2.locked||t2.frozen} onChange={e=>setMixerTarget(t2.id,+e.target.value)}><option value="0">Master</option>{Array.from({length:MAX_TRACKS},(_,i)=>i+1).map(n=><option key={n} value={n}>{p.mixerChannels?.find(c=>c.mixerIndex===n)?.name||'Mixer '+String(n).padStart(2,'0')}</option>)}</select></label>), /* @__PURE__ */ React.createElement("div", { className: "track-menu-footer" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setTrackMenu(null) }, "Close")));
  })())), effectToRemove && /* @__PURE__ */ React.createElement(ModalBackdrop, { onCancel: () => setEffectToRemove(null) }, /* @__PURE__ */ React.createElement("div", { className: "modal", role: "alertdialog", "aria-modal": "true", "aria-labelledby": "remove-effect-title", "aria-describedby": "remove-effect-description", onKeyDown: (e) => {
    e.stopPropagation();
    if (e.key === "Escape") setEffectToRemove(null);
  } }, /* @__PURE__ */ React.createElement("h2", { id: "remove-effect-title" }, effectToRemove.kind==='all'?"Delete All Effects?":effectToRemove.kind==='mixer'?"Delete "+effectToRemove.name+"?":"Delete "+effectToRemove.name+"?"), /* @__PURE__ */ React.createElement("p", { id: "remove-effect-description" }, effectToRemove.kind==='all'?"Delete every effect on "+effectToRemove.name+"?":effectToRemove.kind==='mixer'?"This mixer channel contains effects. Delete the channel and its effects? Linked tracks will target Master.":"This effect has custom settings or automation. Delete it?"), /* @__PURE__ */ React.createElement("button", { disabled:recording||recordStarting||busy, onClick: confirmEffectDeletion }, effectToRemove.kind==='mixer'?"Delete mixer track":effectToRemove.kind==='all'?"Delete All Effects":"Delete effect"), /* @__PURE__ */ React.createElement("button", { autoFocus: true, className: "primary", onClick: () => setEffectToRemove(null) }, "Cancel"))), mobile && <MobileControlsBar hidden={mobileDockHidden} onToggle={()=>{if(!mobileDockHidden){setCollapsed(true);setMixerOpen(false);}setMobileDockHidden(!mobileDockHidden);}}/>, mobile && !mobileDockHidden && <MobileDock playing={playing} recording={recording} starting={recordStarting} busy={busy} clip={clip} canUndo={!!history.undo.length} onUndo={()=>undo()} onPlay={playTransport} onStop={stop} onRecord={mobileRecord} loop={p.loop.enabled} onLoop={()=>commit({...p,loop:{...p.loop,enabled:!p.loop.enabled}})} onEdit={edit} onZoom={direction=>setZoom(z=>Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,z*(direction>0?1.4:1/1.4))))} panel={!collapsed?'effects':mixerOpen?'mixer':null} onPanel={mobilePanel}/>, settings && /* @__PURE__ */ React.createElement(ModalBackdrop, { onCancel: () => {
    var _a2;
    (_a2 = latencyAbort.current) == null ? void 0 : _a2.abort();
    setSettings(false);
  } }, /* @__PURE__ */ React.createElement("div", { className: "modal" }, /* @__PURE__ */ React.createElement("h2", null, "Settings"), /* @__PURE__ */ React.createElement("label", null, "Appearance", /* @__PURE__ */ React.createElement("select", { "aria-label": "Appearance", value: theme, onChange: (e) => setTheme(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "dark" }, "Dark Mode"), /* @__PURE__ */ React.createElement("option", { value: "light" }, "Light Mode"), /* @__PURE__ */ React.createElement("option", { value: "midnight" }, "Midnight Mode"), /* @__PURE__ */ React.createElement("option", { value: "grey" }, "Gray Mode"), /* @__PURE__ */ React.createElement("option", { value: "lotus" }, "Lotus"), /* @__PURE__ */ React.createElement("option", { value: "bamboo" }, "Bamboo"), /* @__PURE__ */ React.createElement("option", { value: "peacock" }, "Peacock"), /* @__PURE__ */ React.createElement("option", { value: "secret" }, "Doodle (WIP)"))), <label>Template<select aria-label="Template" value="" disabled={recording||recordStarting||busy} onChange={e=>chooseTemplate(e.target.value)}><option value="" disabled>Choose a template</option><option value="default">Default</option><option value="recording">Recording</option><option value="maxed">Maxed (Test)</option></select></label>, /* @__PURE__ */ React.createElement("section", { className: "settings-section" }, /* @__PURE__ */ React.createElement("h3", null, "Panel Heights"), /* @__PURE__ */ React.createElement("div", { className: "height-setting" }, /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("input", { "aria-label": "Enable height resizing", type: "checkbox", checked: resizeEnabled, onChange: (e) => setResizeEnabled(e.target.checked) }), resizeEnabled?"Lock resizing of tracks, controls, and mixer panels":"Unlock resizing of tracks, controls, and mixer panels"), /* @__PURE__ */ React.createElement("button", { title: "Reset panel heights", onClick: () => setPanelHeights(defaultHeights()) }, "Reset"))), /* @__PURE__ */ React.createElement("section", { className: "settings-section" }, /* @__PURE__ */ React.createElement("h3", null, "Controls"), /* @__PURE__ */ React.createElement("button", { onClick: () => setControlsOpen(true) }, "Keyboard Controls")), /* @__PURE__ */ React.createElement("label", null, "Audio Input", /* @__PURE__ */ React.createElement("select", { value: device, disabled: recording, onChange: (e) => setDevice(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "System default"), devices.map((d, i) => /* @__PURE__ */ React.createElement("option", { key: d.deviceId || i, value: d.deviceId }, d.label || "Input " + (i + 1))))), /* @__PURE__ */ React.createElement("section", { className: "settings-section" }, /* @__PURE__ */ React.createElement("h3", null, "Latency"), /* @__PURE__ */ React.createElement("div", { className: "settings-actions" }, /* @__PURE__ */ React.createElement("button", { disabled: recording || recordStarting || latencyRunning, onClick: checkLatency }, "Check latency"), /* @__PURE__ */ React.createElement("button", { disabled: recording || recordStarting || busy || latencyRunning, onClick: runLatencyCheck }, "Measure loopback"), latencyRunning && /* @__PURE__ */ React.createElement("button", { onClick: () => {
    var _a2;
    return (_a2 = latencyAbort.current) == null ? void 0 : _a2.abort();
  } }, "Cancel check")), /* @__PURE__ */ React.createElement("p", null, "Loopback measurement needs an output connected to the selected input. The test plays a short, quiet probe; input monitoring stays off."), latencyResult && /* @__PURE__ */ React.createElement("div", { role: "status" }, latencyResult.error ? /* @__PURE__ */ React.createElement("p", null, latencyResult.error) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", null, "Sample rate: ", latencyResult.sampleRate, " Hz", /* @__PURE__ */ React.createElement("br", null), "Browser base latency: ", latencyResult.baseMs === null ? "Not reported" : latencyResult.baseMs.toFixed(1) + " ms", /* @__PURE__ */ React.createElement("br", null), "Output latency: ", latencyResult.outputMs === null ? "Not reported" : latencyResult.outputMs.toFixed(1) + " ms"), latencyResult.roundTripMs !== void 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", null, "Measured round trip: ", latencyResult.roundTripMs.toFixed(1), " ms"), /* @__PURE__ */ React.createElement("button", { onClick: () => setLatency(Math.min(1e3, Math.max(0, latencyResult.roundTripMs - latencyResult.totalMs))) }, "Apply measured compensation"))))), /* @__PURE__ */ React.createElement("label", null, "Extra latency compensation (ms)", /* @__PURE__ */ React.createElement("input", { type: "number", min: "0", max: "1000", value: latency, onDoubleClick: () => setLatency(0), onChange: (e) => setLatency(Math.max(0, Math.min(1e3, +e.target.value))) })), /* @__PURE__ */ React.createElement("button", { className: monitor ? "active" : "", "aria-pressed": monitor, onClick: () => setMonitor(!monitor) }, /* @__PURE__ */ React.createElement(Headphones, { size: 15 }), "Microphone monitoring ", monitor ? "on" : "off"), /* @__PURE__ */ React.createElement("p", null, "Use headphones when monitoring. Input names appear after microphone permission."), /* @__PURE__ */ React.createElement("button", { disabled: latencyRunning, onClick: () => setSettings(false) }, "Done"))), controlsOpen && /* @__PURE__ */ React.createElement(ModalBackdrop, { onCancel: () => setControlsOpen(false) }, /* @__PURE__ */ React.createElement("div", { className: "modal", role: "dialog", "aria-modal": "true", "aria-label": "Keyboard Controls", onKeyDown: (e) => {
    e.stopPropagation();
    if (e.key === "Escape") setControlsOpen(false);
  } }, /* @__PURE__ */ React.createElement("h2", null, "Keyboard Controls"), /* @__PURE__ */ React.createElement("table", { className: "controls-table" }, /* @__PURE__ */ React.createElement("tbody", null, [["Cut / slice selected clip", "S"],["Toggle Loop", "C"],["Move playhead", "Left / Right arrow"],["Zoom playlist", "Ctrl / Cmd + mouse wheel"],["Delete selection", "Ctrl / Cmd + X"],["Copy clip", "Ctrl / Cmd + C"], ["Paste clip at playhead", "Ctrl / Cmd + V"], ["Undo", "Ctrl / Cmd + Z"], ["Redo", "Ctrl / Cmd + Shift + Z or Ctrl + Y"], ["Duplicate clip to new track", "Ctrl / Cmd + D"], ["Delete clip", "Delete / Backspace"], ["Play / Pause", "Space"], ["Stop", "Enter"], ["Arm / disarm recording", "R"], ["Select multiple clips", "Ctrl / Cmd + drag"], ["Move clip within its lane", "Shift + drag"], ["Place selected clip on a lane", "Shift + drag an empty lane"]].map(([action, key]) => /* @__PURE__ */ React.createElement("tr", { key: action }, /* @__PURE__ */ React.createElement("td", null, action), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("kbd", null, key)))))), /* @__PURE__ */ React.createElement("p", null, "Shortcuts apply to the selected clip and pause while you type or use a dialog."), /* @__PURE__ */ <div className="dialog-actions"><button onClick={()=>{setControlsOpen(false);setSettings(true);}}>Back</button><button onClick={()=>setControlsOpen(false)}>Close</button></div>)), toolsOpen && /* @__PURE__ */ React.createElement(ModalBackdrop, { onCancel: () => {
    var _a2;
    (_a2 = cleanupAbort.current) == null ? void 0 : _a2.abort();
    setToolsOpen(false);
  } }, /* @__PURE__ */ React.createElement("div", { className: "modal", role: "dialog", "aria-modal": "true", "aria-label": "Audio cleanup" }, /* @__PURE__ */ React.createElement("h2", null, "Audio Cleanup"), /* @__PURE__ */ React.createElement("label", null, "Track", /* @__PURE__ */ React.createElement("select", { "aria-label": "Cleanup track", value: cleanupTrack, disabled: toolRunning, onChange: (e) => setCleanupTrack(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Select a track"), p.tracks.map((t2) => /* @__PURE__ */ React.createElement("option", { key: t2.id, value: t2.id, disabled: !p.clips.some((c) => c.track === t2.id) }, t2.name)))), /* @__PURE__ */ React.createElement("label", null, "Tool", /* @__PURE__ */ React.createElement("select", { "aria-label": "Cleanup tool", value: cleanupType, disabled: toolRunning, onChange: (e) => {
    setCleanupType(e.target.value);
    setToolsError("");
  } }, Object.entries(TOOL_NAMES).map(([id, name]) => /* @__PURE__ */ React.createElement("option", { key: id, value: id }, name)))), /* @__PURE__ */ React.createElement("p", null, TOOL_DESCRIPTIONS[cleanupType]), cleanupType === "trim" ? /* @__PURE__ */ React.createElement(React.Fragment, null, [["Threshold (dB)", "threshold", -80, -15], ["Minimum silence (ms)", "minimumMs", 100, 2e3], ["Padding (ms)", "retainMs", 0, 500]].map(([label, key, min, max]) => /* @__PURE__ */ React.createElement("label", { key }, label, /* @__PURE__ */ React.createElement(ScrubNumber, { label, min, max, step: key === "threshold" ? 1 : 10, value: cleanupOptions[key], disabled: toolRunning, onChange: (value) => setCleanupOptions({ ...cleanupOptions, [key]: value }) })))) : /* @__PURE__ */ React.createElement("label", null, "Strength: ", cleanupOptions.strength, "%", /* @__PURE__ */ React.createElement("input", { "aria-label": "Cleanup strength", type: "range", min: "0", max: "100", value: cleanupOptions.strength, disabled: toolRunning, onChange: (e) => setCleanupOptions({ ...cleanupOptions, strength: +e.target.value }) })), cleanupType === "dehum" && /* @__PURE__ */ React.createElement("label", null, "Mains frequency", /* @__PURE__ */ React.createElement("select", { "aria-label": "Hum frequency", value: cleanupOptions.humHz, disabled: toolRunning, onChange: (e) => setCleanupOptions({ ...cleanupOptions, humHz: +e.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "50" }, "50 Hz"), /* @__PURE__ */ React.createElement("option", { value: "60" }, "60 Hz"))), /* @__PURE__ */ React.createElement("p", null, cleanupType === "trim" ? "Silence is removed as clip edits on this track. Files and timing are preserved; Undo restores the original clips." : "Clip gain and fades are rendered before cleanup. Track effects and mixer settings stay on the new track. The original is kept and muted."), toolsError && /* @__PURE__ */ React.createElement("p", { className: "tools-error", role: "alert" }, toolsError), /* @__PURE__ */ React.createElement("button", { className: "primary", disabled: toolRunning || !cleanupTrack, onClick: runCleanup }, toolRunning ? "Processing…" : cleanupType === "trim" ? "Remove silence" : "Render new track"), <div className="dialog-actions"><button onClick={()=>{cleanupAbort.current?.abort();setToolsOpen(false);setToolsHome(true);}}>Back</button><button onClick={()=>{cleanupAbort.current?.abort();setToolsOpen(false);}}>Cancel</button></div>)), notepadOpen && /* @__PURE__ */ React.createElement(ModalBackdrop, { onCancel: () => setNotepadOpen(false) }, /* @__PURE__ */ React.createElement("div", { className: "modal notepad-modal", role: "dialog", "aria-label": "Notepad", "aria-modal": "true" }, /* @__PURE__ */ React.createElement("h2", null, "Notepad"), /* @__PURE__ */ React.createElement("p", null, "Write lyrics, song ideas, arrangement notes, recording reminders and mix decisions. Notes are stored in this .trstudio project when you save it."), /* @__PURE__ */ React.createElement("textarea", { "aria-label": "Notes and lyrics", value: notes, maxLength: 2e5, onChange: (e) => {
    setNotes(e.target.value);
    setDirty(true);
  }, placeholder: "Notes, lyrics, ideas…" }), /* @__PURE__ */ React.createElement("button", { onClick: () => download(new Blob([notes], { type: "text/plain" }), "DAW-notes.txt") }, "Download notes"), /* @__PURE__ */ React.createElement("button", { onClick: () => setNotepadOpen(false) }, "Close notepad"))), markerEdit && /* @__PURE__ */ React.createElement(ModalBackdrop, { onCancel: () => setMarkerEdit(null) }, /* @__PURE__ */ React.createElement("div", { className: "modal", role: "dialog", "aria-label": "Section marker", "aria-modal": "true" }, /* @__PURE__ */ React.createElement("h2", null, markerEdit.id ? "Edit" : "Add", " marker"), /* @__PURE__ */ React.createElement("label", null, "Label", /* @__PURE__ */ React.createElement("input", { "aria-label": "Marker label", value: markerEdit.name, maxLength: 128, onChange: (e) => setMarkerEdit({ ...markerEdit, name: e.target.value }) })), /* @__PURE__ */ React.createElement("label", null, "Time (seconds)", /* @__PURE__ */ React.createElement(ScrubNumber, { label: "Marker time", value: markerEdit.time, min: 0, max: 86400, step: 0.1, onChange: (time) => setMarkerEdit({ ...markerEdit, time }) })), /* @__PURE__ */ React.createElement("button", { "aria-label": "Lock marker", "aria-pressed": !!markerEdit.locked, className: markerEdit.locked ? "active" : "", onClick: () => setMarkerEdit({ ...markerEdit, locked: !markerEdit.locked }) }, /* @__PURE__ */ React.createElement(Lock, { size: 13 }), markerEdit.locked ? "Unlock marker" : "Lock marker"), /* @__PURE__ */ React.createElement("button", { className: "primary", disabled: !markerEdit.name.trim(), onClick: saveMarker }, "Save marker"), markerEdit.id && /* @__PURE__ */ React.createElement("button", { onClick: () => {
    commit({ ...p, markers: p.markers.filter((m) => m.id !== markerEdit.id) });
    setMarkerEdit(null);
  } }, "Delete marker"), /* @__PURE__ */ React.createElement("button", { onClick: () => setMarkerEdit(null) }, "Cancel"))), toolsHome && /* @__PURE__ */ React.createElement(ModalBackdrop, { onCancel: () => setToolsHome(false) }, /* @__PURE__ */ React.createElement("div", { className: "modal tools-home", role: "dialog", "aria-label": "Tools", "aria-modal": "true" }, /* @__PURE__ */ React.createElement("h2", null, "Tools"), /* @__PURE__ */ React.createElement("button", { className: "tool-entry", title: "Audio Cleanup", onClick: () => {
    setToolsHome(false);
    setToolsOpen(true);
  } }, /* @__PURE__ */ React.createElement(AudioLines, { size: 19 }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, "Audio Cleanup"), /* @__PURE__ */ React.createElement("small", null, "Silence removal and offline restoration"))), /* @__PURE__ */ React.createElement("button", { className: "tool-entry", title: "Notepad", onClick: () => {
    setToolsHome(false);
    setNotepadOpen(true);
  } }, /* @__PURE__ */ React.createElement(FileText, { size: 19 }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, "Notepad"), /* @__PURE__ */ React.createElement("small", null, "Notes and lyrics saved with your project"))), /* @__PURE__ */ <button className="tool-entry" title="Statistics" onClick={()=>{setToolsHome(false);setStatisticsOpen(true);}}><Activity size={19}/><span><b>Statistics</b><small>Project duration, recordings, size and activity</small></span></button>,React.createElement("button", { onClick: () => setToolsHome(false) }, "Close"))), statisticsOpen&&<StatisticsDialog project={p} assets={assets.current} statistics={statistics.snapshot()} notes={notes} onClose={()=>setStatisticsOpen(false)} onBack={()=>{setStatisticsOpen(false);setToolsHome(true);}}/>,aboutOpen&&<ModalBackdrop onCancel={()=>setAboutOpen(false)}><div className="modal about-modal" role="dialog" aria-label="About" aria-modal="true"><h2 className="about-title"><StudioLogo size={30}/>{STUDIO_NAME}<span className="alpha-badge">ALPHA</span></h2><p className="about-description">Record, mix, and arrange your vocals on PC or mobile. Tabrec Studio is a free, open-source audio recording DAW runs self-hosted right in your browser. Your files stay on your device.</p><section className="alpha-warning"><h3><TriangleAlert size={16}/>Warning</h3><p>Tabrec Studio is in Alpha. Bugs will happen.</p></section><a className="online-link" href="https://tabrecstudio.pages.dev" target="_blank" rel="noopener noreferrer"><Globe size={20}/><span><b>Tabrec Studio Online</b><small>Online browser version, files stay on your device</small></span></a><a className="github-link" href="https://github.com/polssoftware" target="_blank" rel="noreferrer"><Github size={21}/><span><b>polssoftware</b><small>View on GitHub</small></span></a><a className="source-download" href="https://github.com/polssoftware/tabrec-studio" target="_blank" rel="noopener noreferrer"><Download size={16}/><span><b>Download Source</b><small>View and download the source on GitHub</small></span></a><div className="social-links">{[[Youtube,'YouTube'],[Twitter,'Twitter'],[Instagram,'Instagram'],[MessageCircle,'Discord']].map(([Icon,label])=><button key={label} disabled title={label+' link coming soon'}><Icon size={17}/><span>{label}</span></button>)}</div><p className="about-ai"><Sparkles size={15}/>Created with AI.</p><div className="dialog-actions"><button onClick={()=>{setAboutOpen(false);setMenu(true);}}>Back</button><button onClick={()=>setAboutOpen(false)}>Close</button></div></div></ModalBackdrop>, dialog === "new" && /* @__PURE__ */ React.createElement(ModalBackdrop, { onCancel: () => {
    afterSave.current = false;
    setDialog(null);
  } }, /* @__PURE__ */ React.createElement("div", { className: "modal" }, /* @__PURE__ */ React.createElement("h2", null, "Start a new project?"), /* @__PURE__ */ React.createElement("p", null, "Save your current project before starting a new one?"), /* @__PURE__ */ React.createElement("button", { disabled: busy, className: "primary", onClick: () => {
    afterSave.current = true;
    requestSave();
  } }, "Save project & start new"), /* @__PURE__ */ React.createElement("button", { disabled: busy, onClick: newProject }, "Start new without saving"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    afterSave.current = false;
    setDialog(null);
  } }, "Cancel"))), dialog === "export" && /* @__PURE__ */ React.createElement(ModalBackdrop, { onCancel: cancelExport }, /* @__PURE__ */ React.createElement("div", { className: "modal" }, /* @__PURE__ */ React.createElement("h2", null, "Export Audio"), /* @__PURE__ */ <ExportOptions choices={exportChoices} onChange={setExportChoices} level={flacLevel} onLevel={setFlacLevel} seconds={exportDuration} count={exportStemCount} disabled={busy}/>,/* @__PURE__ */ React.createElement("label", null, "Output", /* @__PURE__ */ React.createElement("select", { "aria-label": "Export output", value: exportMode, onChange: (e) => setExportMode(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "mixdown" }, "Mixdown · full song"), /* @__PURE__ */ React.createElement("option", { value: "stems" }, "Split tracks · stems ZIP"))), /* @__PURE__ */ React.createElement("label", null, "Range", /* @__PURE__ */ React.createElement("select", { "aria-label": "Export range", value: exportScope, onChange: (e) => setExportScope(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "full" }, "Full song"), /* @__PURE__ */ React.createElement("option", { value: "selection", disabled: !p.loop.enabled || p.loop.end <= p.loop.start }, "Highlighted playlist range"))), /* @__PURE__ */ React.createElement("p", null, "Full song includes effect tails. Highlighted range exports exactly the yellow playlist selection, including effects. Stems share the same start point."), /* @__PURE__ */ React.createElement("button", { className: "primary", disabled: busy || !p.clips.length || !exportChoices.length, onClick: exportAudio }, busy ? "Rendering…" : "Export"), /* @__PURE__ */ <div className="dialog-actions"><button onClick={()=>{cancelExport();setMenu(true);}}>Back</button><button onClick={cancelExport}>Cancel</button></div>)), /* @__PURE__ */ React.createElement("input", { ref: importInput, "aria-label": "Audio files", hidden: true, type: "file", accept: "audio/wav,audio/mpeg,.mp3,.wav", multiple: true, onChange: (e) => {
    importFiles([...e.target.files], importTarget.current);
    importTarget.current = null;
    e.target.value = "";
  } }), /* @__PURE__ */ React.createElement("input", { ref: openInput, "aria-label": "Open project file", hidden: true, type: "file", accept: ".trstudio,.bdaw", onChange: (e) => {
    open(e.target.files[0]);
    e.target.value = "";
  } }), /* @__PURE__ */ React.createElement("input", { ref: presetInput, "aria-label": "Open effects preset", hidden: true, type: "file", accept: ".trpreset,.bfx", onChange: (e) => {
    loadPreset(e.target.files[0]);
    e.target.value = "";
  } }));
}

if(typeof document!=="undefined")createRoot(document.getElementById("root")).render(<App/>);

export {MixerStrip};
