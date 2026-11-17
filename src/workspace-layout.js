export const defaultHeights=()=>({tracks:{},controls:null,mixer:null});
export function resizedHeight(kind,start,delta,viewport=900){const minimum=kind==='tracks'?80:kind==='controls'?140:200,maximum=kind==='tracks'?400:Math.max(minimum,Math.min(600,viewport*.6));return Math.round(Math.max(minimum,Math.min(maximum,start+delta)));}
export const faderPosition=gain=>`calc(8px + (100% - 16px) * ${Math.max(0,Math.min(1,gain/1.5))})`;
export const faderTicks=[3,0,-3,-6,-9,-12,-15,-Infinity].map(db=>({label:Number.isFinite(db)?(db>0?'+':'')+db:'−∞',position:faderPosition(Number.isFinite(db)?10**(db/20):0)}));
export function enabledAutomations(channel){return Object.entries(channel.automation||{}).filter(([key,points])=>{if(!points.length||channel.automationDisabled?.[key])return false;if(!key.startsWith('fx.'))return true;const effect=channel.effects?.find(e=>e.id===key.split('.')[1]);return !!effect&&effect.enabled!==false&&!channel.bypass&&!channel.frozen;});}

export function dockPresence(controls,mixer,mode=null){const popupControls=controls&&['controls','both'].includes(mode),popupMixer=mixer&&['mixer','both'].includes(mode),mainControls=controls&&!popupControls,mainMixer=mixer&&!popupMixer;return{mainControls,mainMixer,popupControls,popupMixer,tooltipInPopup:!mainControls&&!mainMixer&&(popupControls||popupMixer)};}
