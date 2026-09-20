const canvas=document.getElementById("gameCanvas"),ctx=canvas.getContext("2d");
const scoreEl=document.getElementById("score"),creditsEl=document.getElementById("credits");
const hpBar=document.getElementById("hpBar"),waveEl=document.getElementById("wave"),bossLabel=document.getElementById("bossLabel");
const menu=document.getElementById("menu"),upgradeScreen=document.getElementById("upgrade"),gameOver=document.getElementById("gameOver");
const finalText=document.getElementById("finalText"),upgradeGrid=document.getElementById("upgradeGrid");

const W=960,H=540; let running=false,paused=false,last=0,raf;
let keys={},mouse={x:W/2,y:H/2,down:false},player,enemies,shots,enemyShots,particles,stars;
let score,credits,wave,kills,waveKills,nextWave,spawnTimer,shake;

let upgrades={damage:1,fire:1,speed:1,maxHp:100,crit:0,dash:1};

function resize(){canvas.width=W;canvas.height=H}
function reset(){
 player={x:W/2,y:H*.78,r:14,hp:100,maxHp:100,angle:-Math.PI/2,fire:0,dash:0,inv:0};
 enemies=[];shots=[];enemyShots=[];particles=[];score=0;credits=0;wave=1;kills=0;waveKills=0;nextWave=12;spawnTimer=.5;shake=0;
 upgrades={damage:1,fire:1,speed:1,maxHp:100,crit:0,dash:1};
 stars=Array.from({length:130},()=>({x:Math.random()*W,y:Math.random()*H,s:.4+Math.random()*1.7,a:.2+Math.random()*.8}));
 updateUI();
}
function start(){
 reset();running=true;paused=false;menu.classList.add("hidden");gameOver.classList.add("hidden");
 last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
}
function updateUI(){
 scoreEl.textContent=score.toLocaleString();creditsEl.textContent=credits;
 hpBar.style.width=Math.max(0,player.hp/player.maxHp*100)+"%";waveEl.textContent="WAVE "+wave;
 bossLabel.style.display=enemies.some(e=>e.boss)?"block":"none";
}
function spawnEnemy(){
 const side=Math.floor(Math.random()*4);
 const x=side===0?Math.random()*W:side===1?W:side===2?Math.random()*W:0;
 const y=side===0?0:side===1?Math.random()*H:side===2?H:Math.random()*H;
 const boss=wave%5===0&&waveKills===0&&enemies.length===0;
 let type=Math.random()<.22?"fast":Math.random()<.25?"tank":"normal";
 if(boss)type="boss";
 const max=boss?70+wave*18:(type==="tank"?5:2)+Math.floor(wave*.35);
 enemies.push({x,y,r:boss?32:type==="tank"?21:14,hp:max,max,type,boss,cd:Math.random()*2,speed:boss?32:type==="fast"?105:type==="tank"?35:55});
}
function burst(x,y,n=12){
 for(let i=0;i<n;i++){let a=Math.random()*Math.PI*2,s=30+Math.random()*180;
 particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.5,max:.8,r:1+Math.random()*3});
 }
}
function shoot(){
 if(player.fire>0)return;
 const a=player.angle,crit=Math.random()<upgrades.crit*.08;
 shots.push({x:player.x+Math.cos(a)*18,y:player.y+Math.sin(a)*18,vx:Math.cos(a)*680,vy:Math.sin(a)*680,r:4,dmg:upgrades.damage*(crit?2:1)});
 player.fire=Math.max(.055,.18/upgrades.fire);
}
function dash(){
 if(player.dash<1)return;
 player.dash=0;player.inv=.3;player.x+=Math.cos(player.angle)*105;player.y+=Math.sin(player.angle)*105;burst(player.x,player.y,14);
}
function hurt(dmg){
 if(player.inv>0)return;
 player.hp-=dmg;player.inv=.12;shake=9;burst(player.x,player.y,8);
 if(player.hp<=0)end();
}
function killEnemy(e){
 const val=e.boss?1000:e.type==="tank"?150:e.type==="fast"?80:100;
 score+=val;credits+=e.boss?10:1;kills++;waveKills++;
 burst(e.x,e.y,e.boss?45:18);
 enemies.splice(enemies.indexOf(e),1);
 if(e.boss){score+=wave*500;waveKills=nextWave}
}
function chooseUpgrade(){
 paused=true;upgradeGrid.innerHTML="";
 const opts=[
  ["Plasma Core","+35% weapon damage",()=>upgrades.damage*=1.35],
  ["Overdrive","+25% fire rate",()=>upgrades.fire*=1.25],
  ["Reactor","+20 max hull and full repair",()=>{upgrades.maxHp+=20;player.maxHp+=20;player.hp=player.maxHp}],
  ["Thrusters","+18% movement speed",()=>upgrades.speed*=1.18],
  ["Critical Matrix","+10% critical chance",()=>upgrades.crit+=1],
  ["Phase Drive","Faster dash recharge",()=>upgrades.dash+=.25]
 ].sort(()=>Math.random()-.5).slice(0,3);
 opts.forEach(o=>{
  const b=document.createElement("button");b.className="upgrade";b.innerHTML=`<strong>${o[0]}</strong><span>${o[1]}</span>`;
  b.onclick=()=>{o[2]();upgradeScreen.classList.add("hidden");paused=false;nextWave+=6;updateUI()};upgradeGrid.appendChild(b);
 });
 upgradeScreen.classList.remove("hidden");
}
function end(){
 running=false;cancelAnimationFrame(raf);
 finalText.textContent=`Score: ${score.toLocaleString()} · Wave: ${wave} · Enemies destroyed: ${kills}`;
 gameOver.classList.remove("hidden");
}
function update(dt){
 if(paused)return;
 player.fire=Math.max(0,player.fire-dt);player.inv=Math.max(0,player.inv-dt);player.dash=Math.min(upgrades.dash,player.dash+dt*.12);
 let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
 let dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0),len=Math.hypot(dx,dy)||1;
 if(dx||dy){let sp=235*upgrades.speed;player.x+=dx/len*sp*dt;player.y+=dy/len*sp*dt}
 player.x=Math.max(18,Math.min(W-18,player.x));player.y=Math.max(18,Math.min(H-18,player.y));
 player.angle=Math.atan2(mouse.y-player.y,mouse.x-player.x);if(mouse.down||keys[" "])shoot();
 spawnTimer-=dt;if(spawnTimer<=0&&enemies.length<10+wave){spawnTimer=Math.max(.24,1.15-wave*.035);spawnEnemy()}
 for(let i=shots.length-1;i>=0;i--){let b=shots[i];b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.x<0||b.x>W||b.y<0||b.y>H){shots.splice(i,1);continue}
  for(let j=enemies.length-1;j>=0;j--){let e=enemies[j];if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+b.r){e.hp-=b.dmg;burst(b.x,b.y,4);shots.splice(i,1);if(e.hp<=0)killEnemy(e);break}}
 }
 for(const e of enemies){
  const a=Math.atan2(player.y-e.y,player.x-e.x),d=Math.hypot(player.x-e.x,player.y-e.y);
  e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;e.cd-=dt;
  if(d<player.r+e.r){hurt(e.boss?25:12);e.x-=Math.cos(a)*30;e.y-=Math.sin(a)*30}
  if(e.cd<=0&&d<550){e.cd=e.boss?.9:2.1;let s=e.boss?170:110;enemyShots.push({x:e.x,y:e.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:e.boss?6:4,dmg:e.boss?12:7})}
 }
 for(let i=enemyShots.length-1;i>=0;i--){let b=enemyShots[i];b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.x<0||b.x>W||b.y<0||b.y>H){enemyShots.splice(i,1);continue}
  if(Math.hypot(b.x-player.x,b.y-player.y)<b.r+player.r){hurt(b.dmg);enemyShots.splice(i,1)}
 }
 for(let i=particles.length-1;i>=0;i--){let q=particles[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.97;q.vy*=.97;q.life-=dt;if(q.life<=0)particles.splice(i,1)}
 shake=Math.max(0,shake-dt*25);
 if(waveKills>=nextWave){wave++;waveKills=0;nextWave=12+wave*3;chooseUpgrade()}
 updateUI();
}
function draw(){
 ctx.save();ctx.clearRect(0,0,W,H);
 if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 const bg=ctx.createRadialGradient(W/2,H/2,10,W/2,H/2,700);bg.addColorStop(0,"#0b1730");bg.addColorStop(1,"#03050e");
 ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 for(const s of stars){ctx.globalAlpha=s.a;ctx.fillStyle="#a9d9ff";ctx.fillRect(s.x,s.y,s.s,s.s)}ctx.globalAlpha=1;
 for(const q of particles){ctx.globalAlpha=Math.max(0,q.life/q.max);ctx.fillStyle="#62e6ff";ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
 for(const b of shots){ctx.fillStyle="#eaffff";ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fill()}
 for(const b of enemyShots){ctx.fillStyle="#ff557b";ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fill()}
 for(const e of enemies){
  ctx.save();ctx.translate(e.x,e.y);let col=e.boss?"#ff426e":e.type==="fast"?"#ffd166":e.type==="tank"?"#a78bfa":"#ff6d8d";
  ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,e.r,0,7);ctx.stroke();
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(0,0,5,0,7);ctx.fill();
  if(e.boss){ctx.globalAlpha=.3;ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,0,e.r+8,-Math.PI/2,-Math.PI/2+Math.PI*2*(e.hp/e.max));ctx.stroke()}
  ctx.restore();
 }
 ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.angle);ctx.globalAlpha=player.inv>0?.45:1;
 ctx.fillStyle="#62e6ff";ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(-14,-11);ctx.lineTo(-8,0);ctx.lineTo(-14,11);ctx.closePath();ctx.fill();
 ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(2,0,4,0,7);ctx.fill();ctx.restore();ctx.restore();
}
function loop(t){if(!running)return;const dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw();raf=requestAnimationFrame(loop)}

document.getElementById("startBtn").onclick=start;
document.getElementById("restartBtn").onclick=start;
window.addEventListener("resize",resize);
window.addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if(e.key==="Shift")dash();if(e.key===" ")e.preventDefault()});
window.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
canvas.addEventListener("pointermove",e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*W;mouse.y=(e.clientY-r.top)/r.height*H});
canvas.addEventListener("pointerdown",e=>{mouse.down=true;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener("pointerup",()=>mouse.down=false);
canvas.addEventListener("pointercancel",()=>mouse.down=false);
resize();reset();
