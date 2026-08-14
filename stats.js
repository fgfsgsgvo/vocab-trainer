// ===================== STATS =====================
function getStreak(){
  const s = loadStats(); const now = new Date();
  let streak=0;
  for(let i=0;i<365;i++){
    const d = new Date(now); d.setDate(d.getDate()-i);
    if(s[d.toISOString().slice(0,10)]) streak++;
    else if(i>0) break;
  }
  return streak;
}
function getDayChart(days=7){
  const s = loadStats();
  const now = new Date();
  const result=[];
  for(let i=days-1;i>=0;i--){
    const d = new Date(now); d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    const val = s[key]||0;
    const label = (d.getMonth()+1)+'/'+d.getDate();
    result.push({key, val, label});
  }
  return result;
}
const MAX_BAR_VAL = 50;
