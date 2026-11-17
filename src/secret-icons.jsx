import React from 'react';
const drawings=import.meta.glob('./assets/secret/*.png',{eager:true,query:'?url',import:'default'});
export function ThemedIcon({name,Fallback,size=15,nativeProps={}}){
 const source=drawings['./assets/secret/'+name+'.png'];if(!source)return <Fallback size={size} {...nativeProps}/>;
 return <span className="themed-icon" style={{width:size,height:size}}><span className="native-icon"><Fallback size={size} {...nativeProps}/></span><span className={'secret-drawing '+(nativeProps.className||'')} aria-hidden="true" data-drawing={name} style={{width:size,height:size,maskImage:`url("${source}")`,WebkitMaskImage:`url("${source}")`}}/></span>;
}
export function SecretText({text,drawing}){
 const value=String(text);return <span className="secret-text"><span className="native-text">{value}</span><span className="secret-glyphs" aria-hidden="true">{(drawing?[drawing]:[...value].map(c=>/\d/.test(c)?'digit-'+c:c===':'?'colon':c==='%'?'percent':null)).map((name,i)=>name?<span key={i} data-drawing={name} className={'secret-glyph '+(drawing?'word-glyph':'')} style={{maskImage:`url("${drawings['./assets/secret/'+name+'.png']}")`,WebkitMaskImage:`url("${drawings['./assets/secret/'+name+'.png']}")`}}/>:<span key={i} className="secret-punctuation" data-symbol={value[i]}/>)}</span></span>;
}
