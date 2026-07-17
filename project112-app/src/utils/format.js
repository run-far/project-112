export const fmtDate=v=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v+'T00:00:00'));
export const pace=(km,min)=>km?`${Math.floor(min/km)}:${String(Math.round((min/km%1)*60)).padStart(2,'0')} /km`:'–';
export const daysUntil=v=>Math.max(0,Math.ceil((new Date(v+'T00:00:00')-new Date().setHours(0,0,0,0))/86400000));
export const hours=min=>`${Math.floor(min/60)}:${String(min%60).padStart(2,'0')} h`;
