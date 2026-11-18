import React from 'react';
export function ChannelDot({name,muted,solo,onMute,onSolo,onAddSolo,disabled}){
 return <button className={'channel-dot '+(muted?'muted':'enabled')+(solo?' soloed':'')} aria-label={'Mute / solo '+name} title={name+' · Left-click to mute · Right-click to solo'} aria-pressed={!muted} data-solo={!!solo} disabled={disabled} onClick={e=>{e?.stopPropagation();if((e?.ctrlKey||e?.metaKey)&&onAddSolo)onAddSolo();else onMute();}} onContextMenu={e=>{e.preventDefault();e.stopPropagation();if(!disabled)onSolo();}}><span aria-hidden="true"/></button>;
}
