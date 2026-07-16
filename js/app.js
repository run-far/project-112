fetch('data/training.json',{cache:'no-store'}).then(r=>r.json()).then(d=>{
const days=x=>Math.max(0,Math.ceil((new Date(x+'T00:00:00')-new Date())/86400000));
hbu.textContent=days(d.races.hbu);backyard.textContent=days(d.races.backyard);
current.textContent=d.week.currentKm;goal.textContent=d.week.goalKm;
progress.style.width=Math.min(100,d.week.currentKm/d.week.goalKm*100)+'%';
next.textContent=d.next.title;nextDetails.textContent=d.next.details;
focus.textContent=d.focus.title;focusText.textContent=d.focus.text;
events.innerHTML=d.events.map(e=>`<div class="event ${e.done?'done':''}"><b>${e.day}</b><div><strong>${e.title}</strong><div class="muted">${e.details}</div></div><span>${e.done?'✅':'⬜'}</span></div>`).join('');
});