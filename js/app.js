async function loadData(){
 const r=await fetch('data/training.json',{cache:'no-store'}); const d=await r.json();
 const days=x=>{const t=new Date();t.setHours(0,0,0,0);return Math.max(0,Math.ceil((new Date(x+'T00:00:00')-t)/86400000));};
 hbuDays.textContent=days(d.races.hbu);
 backyardDays.textContent=days(d.races.backyard);
 weekCurrent.textContent=d.week.currentKm; weekGoal.textContent=d.week.goalKm;
 trainingScore.textContent=d.week.score;
 weekProgress.style.width=Math.min(100,d.week.currentKm/d.week.goalKm*100)+'%';
 runKm.textContent=d.week.currentKm+' km'; footballKm.textContent=d.week.footballKm+' km';
 bikeKm.textContent=d.week.bikeKm+' km'; rowMin.textContent=d.week.rowMinutes+' Min';
 stabiCount.textContent=d.week.stabiDone+' / '+d.week.stabiGoal;
 athleteStatus.textContent=d.athlete.status; athleteNote.textContent=d.athlete.note;
 nextTitle.textContent=d.next.title; nextDetails.textContent=d.next.details;
 focusTitle.textContent=d.focus.title; focusText.textContent=d.focus.text;

 weekList.innerHTML=d.events.map(e=>`
  <div class="event">
   <div class="event-head">
    <strong>${e.day}</strong>
    <div><strong>${e.title}</strong><div class="muted">${e.time}</div></div>
    <span class="status-pill">${e.status}</span>
   </div>
   <div class="event-details">
    <div class="planbox"><div class="small-label">Geplant</div><div>${e.planned}</div></div>
    <div class="actualbox"><div class="small-label">Tatsächlich</div><div>${e.actual || 'Noch offen'}</div></div>
   </div>
   ${e.reason ? `<div class="reason"><strong>Grund:</strong> ${e.reason}</div>` : ''}
   ${e.learning ? `<div class="reason"><strong>Learning:</strong> ${e.learning}</div>` : ''}
  </div>`).join('');

 const max=Math.max(...d.statsByType.map(s=>s.km),1);
 typeStats.innerHTML=d.statsByType.map(s=>`<div class="type-row"><strong>${s.label}</strong><div class="mini-bar"><i style="width:${s.km/max*100}%"></i></div><span>${s.km} km</span></div>`).join('');
 fuelList.innerHTML=d.fuel.map(f=>`<div class="item"><div class="item-title"><span>${f.product}</span><span class="status-pill">${f.stock}</span></div><div class="item-meta">${f.tolerance}</div><div class="item-meta">${f.note}</div></div>`).join('');
 weaknessList.innerHTML=d.weaknesses.map(w=>`<div class="item"><div class="item-title"><span>${w.title}</span><span class="status-pill">${w.status}</span></div><div class="item-meta">Maßnahmen: ${w.actions.join(' · ')}</div><div class="item-meta">Nächste Prüfung: ${w.review}</div></div>`).join('');
 missionList.innerHTML=d.missions.map(m=>`<div class="mission"><strong>${m.title}</strong><div class="mission-grid"><div><div class="small-label">Plan</div><p>${m.planned}</p></div><div><div class="small-label">Ist</div><p>${m.actual}</p></div></div><p><strong>Status:</strong> ${m.status}</p><p class="muted"><strong>Grund:</strong> ${m.reason}</p><p class="muted"><strong>Learning:</strong> ${m.learning}</p></div>`).join('');
}
const ids=['hbu-days','backyard-days','week-current','week-goal','training-score','week-progress','run-km','football-km','bike-km','row-min','stabi-count','athlete-status','athlete-note','next-title','next-details','focus-title','focus-text','week-list','type-stats','fuel-list','weakness-list','mission-list'];
ids.forEach(id=>window[id.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=document.getElementById(id));
loadData().catch(console.error);
