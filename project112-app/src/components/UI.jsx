export const Card=({children,className=''})=><section className={`card ${className}`}>{children}</section>;
export const Metric=({label,value,sub})=><div className="metric"><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>;
export const PageTitle=({eyebrow,title,children})=><header className="page-title"><p>{eyebrow}</p><h1>{title}</h1>{children&&<div>{children}</div>}</header>;
export const Score=({label,value,onChange})=><label className="score"><span>{label}<b>{value}/10</b></span><input type="range" min="1" max="10" value={value} onChange={e=>onChange(e.target.value)}/></label>;
