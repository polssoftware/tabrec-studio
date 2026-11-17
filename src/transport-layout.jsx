import React from 'react';
export function TransportLayout({children}){const parts=React.Children.toArray(children);return <section className="transport"><div className="transport-left">{parts[0]}{parts[1]}</div><div className="transport-center">{parts[2]}</div><div className="transport-right"/></section>;}
