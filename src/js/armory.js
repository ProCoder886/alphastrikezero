// ---------- Armory: weapon browser, rotating 3D showcase, loadout and attachment editor ----------
// Opens from the main menu. Left: the loadout (3 primaries, 2 secondaries, melee, grenade). Middle: the selected
// weapon as a full 3D model turning through 360 degrees (drag to turn it by hand, wheel to zoom), its stats and
// attachment slots. Right: the catalogue by category with rendered thumbnails, locks and unlock requirements.
// The showcase is drawn by the game's own renderer into the region of the screen left open by the panel (no second
// WebGL context); thumbnails are rendered once into a small render target and kept as images.
const ARM_CSS = `
#armory{position:fixed;inset:0;z-index:25;display:flex;flex-direction:column;pointer-events:none}
#armory>*{pointer-events:auto}
#armory .armTop{flex:none;height:58px;display:flex;align-items:center;gap:18px;padding:0 22px;background:rgba(8,11,15,.97);border-bottom:1px solid var(--line)}
#armory .armTop h2{font-weight:300;letter-spacing:.42em;font-size:21px;color:#fff}
#armory .armTop h2 b{color:var(--amber);font-weight:600}
#armory .armLv{font:11px Consolas,monospace;letter-spacing:.14em;color:#9aa4b2}
#armory .armLv b{color:#fff}
#armory .armTop .sp{flex:1}
#armory .armBody{flex:1;min-height:0;display:flex}
#armory .armLeft{flex:none;width:236px;background:rgba(8,11,15,.97);border-right:1px solid var(--line);padding:10px 12px;overflow:hidden}
#armSlots .armGrp{font:700 9.5px Consolas,monospace;letter-spacing:.26em;color:#8f99a8;margin:6px 2px 5px;display:flex;justify-content:space-between}
#armSlots .armGrp:first-child{margin-top:0}
#armRandom{margin-right:10px}
#armory .armRight{flex:none;width:min(400px,31vw);background:rgba(8,11,15,.97);border-left:1px solid var(--line);display:flex;flex-direction:column;min-height:0}
#armory .armMid{flex:1;min-width:0;display:flex;flex-direction:column;position:relative}
body.armoryOpen #waveBanner,body.armoryOpen #pgLevel,body.armoryOpen #killcam,body.armoryOpen #slowmoTag{display:none}
#armView{flex:1;min-height:0;position:relative;cursor:grab;overflow:hidden;touch-action:none}
#armView.drag{cursor:grabbing}
#armView .fx{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 46%,transparent 30%,rgba(4,6,9,.55) 100%);
  box-shadow:inset 0 0 0 1px var(--line)}
#armView .fx::before{content:"";position:absolute;left:8%;right:8%;bottom:17%;height:1px;background:linear-gradient(90deg,transparent,rgba(230,42,94,.5),transparent)}
#armName{position:absolute;left:22px;top:16px;pointer-events:none}
#armName small{display:block;font:10px Consolas,monospace;letter-spacing:.3em;color:var(--amber)}
#armName b{display:block;font-size:30px;font-weight:300;letter-spacing:.18em;color:#fff;text-shadow:0 2px 8px #000}
#armName span{display:block;font-size:11.5px;letter-spacing:.06em;color:#aeb7c4;margin-top:2px;max-width:420px}
#armLock{position:absolute;right:22px;top:18px;font:700 11px Consolas,monospace;letter-spacing:.16em;color:#ffb0b8;background:rgba(60,8,16,.8);border:1px solid var(--amber);padding:6px 12px;pointer-events:none}
#armView .rot{position:absolute;left:0;right:0;bottom:8px;text-align:center;font:9.5px Consolas,monospace;letter-spacing:.3em;color:#6f7a88;pointer-events:none}
#armInfo{flex:none;display:flex;gap:18px;padding:12px 18px 14px;background:rgba(8,11,15,.97);border-top:1px solid var(--line);min-height:158px}
#armStats{flex:none;width:226px}
.armBar{display:flex;align-items:center;gap:8px;margin:5px 0;font:10px Consolas,monospace;letter-spacing:.12em;color:#9aa4b2}
.armBar span{width:74px}.armBar i{flex:1;height:5px;background:rgba(255,255,255,.09);position:relative}
.armBar i b{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#a3243a,var(--amber))}
.armBar em{width:26px;text-align:right;font-style:normal;color:#fff}
#armNums{font:10.5px Consolas,monospace;letter-spacing:.08em;color:#9aa4b2;margin-top:8px;line-height:1.7}
#armNums b{color:#fff;font-weight:600}
#armAtt{flex:1;min-width:0}
#armAtt .row{display:flex;flex-wrap:wrap;gap:6px}
.armSlotB{flex:1 1 132px;min-width:132px;text-align:left;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.12);color:#dfe6ee;padding:6px 9px;cursor:pointer;font:inherit}
.armSlotB:hover{border-color:var(--amber)}
.armSlotB small{display:block;font:9px Consolas,monospace;letter-spacing:.22em;color:var(--amber)}
.armSlotB b{display:block;font-size:11.5px;font-weight:600;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.armSlotB.none b{color:#77818f;font-weight:400}
#armAttDesc{font-size:11px;color:#8f99a8;margin-top:7px;min-height:15px;letter-spacing:.03em}
#armEquip{position:absolute;right:18px;bottom:28px;width:178px;display:flex;flex-direction:column;gap:7px;z-index:1}
#armEquip .btn{width:100%;padding:11px 8px;font-size:12.5px}
#armEquip .btn[disabled]{opacity:.38;cursor:not-allowed}
#armEquipNote{font:10px Consolas,monospace;letter-spacing:.12em;color:#c5ccd6;text-align:center;text-shadow:0 1px 3px #000}
.armLoad{display:grid;grid-template-columns:minmax(0,1fr) 84px;align-items:center;column-gap:6px;width:100%;text-align:left;margin:0 0 5px;padding:5px 8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);color:#dfe6ee;cursor:pointer;font:inherit;position:relative;min-height:44px}
.armLoad .tx{min-width:0;grid-column:1;grid-row:1}
.armLoad:hover{border-color:rgba(230,42,94,.6)}
.armLoad.active{border-color:var(--amber);background:rgba(230,42,94,.12);box-shadow:inset 3px 0 0 var(--amber)}
.armLoad small{display:block;font:8.5px Consolas,monospace;letter-spacing:.12em;color:var(--amber);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.armLoad b{display:block;font-size:11.5px;font-weight:600;letter-spacing:.06em;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.armLoad img,.armLoad .ico{grid-column:2;grid-row:1;display:block;width:84px;height:30px;object-fit:contain;filter:drop-shadow(0 2px 3px #000)}
.armLoad .ico svg{width:100%;height:100%}
.armLoad kbd{position:absolute;right:5px;top:3px;font:700 9px Consolas,monospace;color:#77818f}
#armTabs{flex:none;display:flex;flex-wrap:wrap;gap:4px;padding:12px 12px 8px}
#armTabs button{flex:1 1 17%;background:none;border:1px solid rgba(255,255,255,.12);color:#9aa4b2;font:700 10px Consolas,monospace;letter-spacing:.12em;padding:6px 2px;cursor:pointer}
#armTabs button:hover{color:#fff}
#armTabs button.active{color:#fff;border-color:var(--amber);background:rgba(230,42,94,.16)}
#armTabs button.slot{border-color:rgba(230,42,94,.45);color:#d6dbe2}
#armCatTitle{flex:none;padding:2px 14px 8px;font:10px Consolas,monospace;letter-spacing:.2em;color:#8f99a8;display:flex;justify-content:space-between}
#armGrid{flex:1;min-height:0;overflow:hidden;padding:0 12px 6px;display:grid;grid-template-columns:repeat(var(--gc,2),minmax(0,1fr));gap:7px;align-content:start}
.armCard{position:relative;min-width:0;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);padding:6px 8px 7px;cursor:pointer;min-height:92px}
.armCard .spin{display:block;width:100%;height:54px;background-repeat:no-repeat;filter:drop-shadow(0 2px 3px #000)}
#armGrid.dense .armCard{min-height:84px;padding:5px 6px 6px}
#armGrid.dense .armCard img,#armGrid.dense .armCard .ph,#armGrid.dense .armCard .spin{height:46px}
#armGrid.dense .armCard b{font-size:10px}
.armCard.locked .spin{filter:brightness(.42) saturate(.2)}
.armCard:hover{border-color:rgba(230,42,94,.6)}
.armCard.sel{border-color:var(--amber);background:rgba(230,42,94,.1)}
.armCard img{display:block;width:100%;height:54px;object-fit:contain;filter:drop-shadow(0 2px 3px #000)}
.armCard .ph{height:54px}
.armCard b{display:block;font-size:11px;font-weight:600;letter-spacing:.08em;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.armCard small{display:block;font:9px Consolas,monospace;letter-spacing:.1em;color:#8f99a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.armCard.locked img{filter:brightness(.42) saturate(.2)}
.armCard.locked b{color:#8a93a0}
.armCard.locked small{color:#c9808a}
.armCard .tag{position:absolute;right:5px;top:5px;font:700 8.5px Consolas,monospace;letter-spacing:.08em;padding:1px 5px}
.armCard .tag.eq{background:var(--amber);color:#fff}
.armCard .tag.new{background:#fff;color:#111}
.armCard .tag.lock{background:rgba(0,0,0,.6);color:#c9808a;border:1px solid rgba(230,42,94,.5)}
.armCard i.prog{position:absolute;left:0;bottom:0;height:2px;background:var(--amber)}
#armPick{position:absolute;left:14px;right:14px;bottom:166px;max-height:46%;background:rgba(8,11,15,.98);border:1px solid var(--amber);padding:8px;display:flex;z-index:2}
#armPick button{text-align:left;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.12);color:#dfe6ee;padding:7px 9px;cursor:pointer;font:inherit}
#armPick button:hover,#armPick button.cur{border-color:var(--amber)}
#armPick button b{display:block;font-size:11.5px;letter-spacing:.06em}
#armPick button span{display:block;font-size:10.5px;color:#8f99a8;margin-top:2px}
#armoryBtn2{margin-bottom:8px}
#armSub{display:none}
#armory .pagerBar{font-size:11px;gap:10px;min-height:34px;margin:0;padding:6px 0 8px}
#armory .pagerBar button{min-width:40px;height:28px;font-size:12px}
#armGridBar{flex:none}
#armPick{flex-direction:column}
#armPick .pickHead{flex:none;display:flex;justify-content:space-between;align-items:center;font:700 10px Consolas,monospace;letter-spacing:.2em;color:var(--amber);padding:0 2px 6px}
#armPick .pickHead button{background:transparent;border:1px solid #4a3a3e;color:#c8a8ae;width:26px;height:24px;cursor:pointer;font:inherit}
#armPickList{flex:1;min-height:0;overflow:hidden;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px;align-content:start}
/* full loadout: one horizontal strip of all nine slots, a green tick on every filled one */
#armLoadBar{flex:none;display:flex;align-items:stretch;gap:6px;padding:8px 14px 9px;background:linear-gradient(180deg,rgba(16,22,30,.98),rgba(8,11,15,.98));border-bottom:1px solid var(--line);box-shadow:inset 0 -1px 0 rgba(47,211,107,.12);touch-action:pan-x}
#armLoadBar .lbSep{flex:none;width:1px;margin:4px 2px;background:linear-gradient(180deg,transparent,rgba(255,255,255,.18),transparent)}
.lbT{flex:1 1 0;min-width:0;position:relative;display:flex;flex-direction:column;gap:2px;padding:5px 8px 6px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.015));border:1px solid rgba(255,255,255,.1);border-radius:5px;color:#dfe6ee;cursor:pointer;font:inherit;text-align:left;transition:border-color .15s,background .15s,transform .15s,box-shadow .15s}
.lbT:hover{border-color:rgba(230,42,94,.6);transform:translateY(-1px)}
.lbT.active{border-color:var(--amber);background:linear-gradient(180deg,rgba(230,42,94,.22),rgba(230,42,94,.06));box-shadow:0 0 0 1px rgba(230,42,94,.35),0 4px 16px rgba(230,42,94,.2)}
.lbT small{display:block;font:700 8.5px Consolas,monospace;letter-spacing:.13em;color:var(--amber);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:18px}
.lbT small kbd{font:inherit;color:#8f99a8;margin-right:4px}
.lbT .lbPic{height:34px;display:flex;align-items:center;justify-content:center}
.lbT .lbPic img,.lbT .lbPic svg{display:block;max-width:100%;max-height:34px;object-fit:contain;filter:drop-shadow(0 2px 3px #000)}
.lbT .lbPic svg{height:30px;width:60px}
.lbT b{display:block;font-size:10.5px;font-weight:600;letter-spacing:.05em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lbT.empty b{color:#77818f;font-weight:400}
.lbTick{position:absolute;right:5px;top:5px;width:15px;height:15px;border-radius:50%;background:#2fd36b;box-shadow:0 0 0 2px rgba(47,211,107,.22),0 0 8px rgba(47,211,107,.55);display:flex;align-items:center;justify-content:center}
.lbTick svg,.armCard .tick svg{width:70%;height:70%}
.lbT.empty .lbTick{display:none}
.lbT.pop .lbTick{animation:armTick .5s cubic-bezier(.2,1.6,.4,1)}
@keyframes armTick{0%{transform:scale(0)}100%{transform:scale(1)}}
.armCard .tick{position:absolute;left:5px;top:5px;width:15px;height:15px;border-radius:50%;background:#2fd36b;box-shadow:0 0 6px rgba(47,211,107,.6);display:flex;align-items:center;justify-content:center;z-index:1}
.armCard.eq{border-color:rgba(47,211,107,.45)}
.armCard.eq.sel{border-color:var(--amber)}
html:not(.rsp) #armory .armLeft{display:none}
/* RANDOM PICK stands out: green, a dice, a slow glow */
#armRandom.rnd{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#34d872,#139a48);border:1px solid #6df39c;color:#04170a;font-weight:700;letter-spacing:.16em;text-indent:0;box-shadow:0 0 12px rgba(47,211,107,.5);animation:armRnd 1.9s ease-in-out infinite}
#armRandom.rnd svg{width:18px;height:18px;flex:none}
#armRandom.rnd:hover{background:linear-gradient(135deg,#4ff08a,#1bb558);color:#04170a;transform:scale(1.04)}
#armRandom.rnd:active{transform:scale(.97)}
#armRandom.roll svg{animation:armDice .5s ease-out}
@keyframes armRnd{0%,100%{box-shadow:0 0 8px rgba(47,211,107,.4)}50%{box-shadow:0 0 22px rgba(47,211,107,.9),0 0 0 3px rgba(47,211,107,.22)}}
@keyframes armDice{0%{transform:rotate(0) scale(1)}50%{transform:rotate(200deg) scale(1.3)}100%{transform:rotate(360deg) scale(1)}}
html.rsp #armory{display:grid;padding:var(--st) var(--sr) var(--sb) var(--sl);background:linear-gradient(rgba(8,11,15,.99),rgba(8,11,15,.99)) 0 0/100% var(--st) no-repeat}
html.rsp #armory .armBody,html.rsp #armory .armMid,html.rsp #armInfo{display:contents}
html.landscape #armory{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);grid-template-rows:auto auto auto minmax(0,1fr) auto;grid-template-areas:"top top" "load load" "view sub" "view panel" "stats panel"}
html.portrait #armory{grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto minmax(12rem,28%) auto auto minmax(0,1fr);grid-template-areas:"top" "load" "view" "stats" "sub" "panel"}
html.rsp #armLoadBar{grid-area:load;min-width:0;overflow-x:auto;overflow-y:hidden;gap:.4rem;padding:.4rem .8rem .5rem;scrollbar-width:none;-webkit-overflow-scrolling:touch}
html.rsp #armLoadBar::-webkit-scrollbar{display:none}
html.rsp #armLoadBar .lbSep{margin:.3rem .1rem}
html.rsp .lbT{flex:1 0 7.6rem;padding:.3rem .5rem .35rem;border-radius:.5rem}
html.rsp .lbT small{font-size:.72rem;padding-right:1.6rem}
html.rsp .lbT .lbPic{height:2.5rem}
html.rsp .lbT .lbPic img{max-height:2.5rem}
html.rsp .lbT .lbPic svg{height:2.3rem;width:4.6rem}
html.rsp .lbT b{font-size:.92rem}
html.rsp .lbTick,html.rsp .armCard .tick{width:1.4rem;height:1.4rem;right:.35rem;top:.35rem}
html.rsp .armCard .tick{left:.35rem;right:auto}
html.portrait #armory .armTop #armRandom{order:2}
#armSub button[data-s="l"]{display:none!important}
html.portrait #armLoadBar{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));overflow:visible;gap:.35rem}
html.portrait #armLoadBar .lbSep{display:none}
html.portrait .lbT{min-width:0;padding:.25rem .4rem .3rem}
html.portrait .lbT .lbPic{height:2.1rem}
html.portrait .lbT .lbPic img{max-height:2.1rem}
html.portrait .lbT .lbPic svg{height:1.9rem;width:3.8rem}
html.portrait .lbT b{font-size:.8rem}
html.portrait .lbT small{font-size:.66rem;padding-right:1.5rem}
html.rsp #armRandom.rnd{gap:.6rem}
html.rsp #armRandom.rnd svg{width:1.7rem;height:1.7rem}
html.rsp #armory .armTop{grid-area:top;height:auto;min-height:4.6rem;padding:.6rem 1.2rem;gap:.8rem 1.2rem;flex-wrap:wrap}
html.rsp #armory .armTop h2{font-size:1.9rem;letter-spacing:.3em}
html.rsp #armory .armLv{font-size:.9rem;letter-spacing:.08em}
html.portrait #armory .armLv{order:3;flex:1 1 100%;margin-top:-.2rem}
html.portrait #armory .armTop .sp{display:none}
html.portrait #armory .armTop #armClose{margin-left:auto}
html.rsp #armory .armTop .btn.sub{margin:0;min-height:4rem;padding:.6rem 1.2rem;font-size:1.1rem}
html.rsp #armView{grid-area:view;min-height:0;touch-action:none}
html.rsp #armView .rot{display:none}
html.rsp #armName{left:1rem;top:.8rem;right:1rem}
html.rsp #armName small{font-size:.85rem}
html.rsp #armName b{font-size:2.3rem;letter-spacing:.12em}
html.rsp #armName span{font-size:1rem;max-width:100%}
html.rsp #armLock{top:auto;bottom:1rem;left:1rem;right:auto;font-size:.9rem;padding:.5rem .8rem;max-width:calc(100% - 18rem)}
html.rsp #armEquip{right:1rem;bottom:1rem;width:15rem;gap:.5rem}
html.rsp #armEquip .btn{padding:.8rem .6rem;font-size:1.25rem;min-height:4.4rem}
html.rsp #armEquipNote{font-size:.9rem}
html.rsp #armStats{grid-area:stats;width:auto;padding:.8rem 1.2rem;background:rgba(8,11,15,.97);border-top:1px solid var(--line);display:grid;grid-template-columns:1fr 1fr;column-gap:1.6rem;align-content:start}
html.rsp .armBar{margin:.3rem 0;font-size:.85rem;gap:.6rem}
html.rsp .armBar span{width:6.4rem}
html.rsp .armBar i{height:.5rem}
html.rsp .armBar em{width:2.4rem}
html.rsp #armNums{grid-column:1/-1;font-size:.95rem;margin-top:.4rem;line-height:1.5}
html.rsp #armSub{grid-area:sub;display:grid;grid-template-columns:repeat(2,1fr);gap:.4rem;padding:.6rem 1rem .4rem;background:rgba(8,11,15,.97)}
html.rsp #armSub button{background:rgba(0,0,0,.5);border:1px solid #3a434f;color:#9aa4b1;font:inherit;font-size:1.05rem;letter-spacing:.1em;padding:.6rem .2rem;min-height:3.8rem;cursor:pointer}
html.rsp #armSub button.active{border-color:var(--amber);background:var(--amber);color:#fff}
html.rsp #armory .armRight,html.rsp #armory .armLeft,html.rsp #armAtt{grid-area:panel;min-height:0;min-width:0;width:auto;border:0;background:rgba(8,11,15,.97);overflow:hidden}
html.rsp #armory[data-sub="w"] .armLeft,html.rsp #armory[data-sub="w"] #armAtt,html.rsp #armory[data-sub="a"] .armLeft,html.rsp #armory[data-sub="a"] .armRight,html.rsp #armory[data-sub="l"] .armRight,html.rsp #armory[data-sub="l"] #armAtt{display:none}
html.rsp #armory .armLeft{padding:.4rem 1rem}
html.rsp #armory .armLeft .grpTitle,html.rsp #armory .armLeft > div:last-child{display:none}
html.rsp #armSlots{display:grid;grid-template-columns:1fr 1fr;gap:.4rem .5rem}
html.rsp #armSlots .armGrp{grid-column:1/-1;font-size:.8rem;margin:.2rem .2rem 0}
html.rsp #armRandom{margin:0}
html.rsp .armLoad{margin:0;padding:.4rem .7rem;grid-template-columns:minmax(0,1fr) 6.4rem;min-height:0}
html.rsp .armLoad small{font-size:.8rem}
html.rsp .armLoad b{font-size:1.1rem}
html.rsp .armLoad img,html.rsp .armLoad .ico{width:6.4rem;height:2.6rem}
html.rsp .armLoad kbd{font-size:.9rem;right:.6rem;top:.5rem}
html.rsp #armAtt{padding:.4rem 1rem}
html.rsp #armAtt .row{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}
html.rsp .armSlotB{min-width:0;padding:.7rem .9rem;min-height:5.2rem}
html.rsp .armSlotB small{font-size:.8rem}
html.rsp .armSlotB b{font-size:1.1rem}
html.rsp #armAttDesc{font-size:1rem;min-height:2.8rem;margin-top:.8rem;line-height:1.4}
html.rsp #armAtt .grpTitle{margin:0 0 .6rem}
html.rsp #armTabs{display:grid;grid-template-columns:repeat(9,1fr);gap:.3rem;padding:.4rem 1rem .5rem}
html.rsp #armTabs button{font-size:.95rem;letter-spacing:.02em;padding:.5rem .1rem;min-height:4rem}
html.rsp #armCatTitle{font-size:.85rem;padding:.2rem 1rem .5rem}
html.rsp #armGrid{padding:0 1rem;grid-template-columns:repeat(var(--gc,2),minmax(0,1fr));gap:.6rem;align-content:start}
html.rsp #armGrid.dense .armCard{min-height:0;padding:.4rem .5rem}
html.rsp #armGrid.dense .armCard b{font-size:.95rem}
html.rsp #armGrid.dense .armCard small{font-size:.72rem}
html.rsp .armCard{min-height:8.2rem;padding:.6rem .8rem}
html.rsp .armCard img,html.rsp .armCard .ph,html.rsp .armCard .spin{height:4.6rem}
html.rsp .armCard b{font-size:1.1rem;margin-top:.2rem}
html.rsp .armCard small{font-size:.8rem}
html.rsp .armCard .tag{font-size:.75rem;right:.4rem;top:.4rem;padding:.1rem .4rem}
html.rsp #armory .pagerBar{font-size:1.1rem;gap:1rem;min-height:4rem;padding:.3rem 0 .4rem}
html.rsp #armory .pagerBar button{min-width:5rem;height:3.9rem;font-size:1.3rem}
html.rsp #armory.picking #armAtt{visibility:hidden}
html.rsp #armPick{grid-area:panel;position:relative;left:auto;right:auto;bottom:auto;max-height:none;margin:0;padding:.6rem 1rem;z-index:4;border:0;border-top:1px solid var(--amber);min-height:0}
html.rsp #armPick .pickHead{font-size:.95rem;padding-bottom:.6rem}
html.rsp #armPick .pickHead button{width:4rem;height:3.4rem;font-size:1.3rem}
html.rsp #armPickList{grid-template-columns:1fr 1fr;gap:.5rem}
html.rsp #armPick button.opt{padding:.7rem .9rem;min-height:5.6rem}
html.rsp #armPick button b{font-size:1.1rem}
html.rsp #armPick button span{font-size:.9rem;line-height:1.3}
`;

const ARMORY = {
  open: false, cat: 'mg', sel: null, slot: { g: 'primary', i: 0 }, yaw: 0.6, pitch: 0.1, zoom: 1, auto: true, autoT: 0, drag: null,
  scene: null, cam: null, obj: null, objKey: '', el: null, _thumbQ: [], _rt: null, pick: null, sub: 'w',
  TAB3: { mg: 'MG', smg: 'SMG', lmg: 'LMG', rifle: 'SNP', assault: 'AR', shotgun: 'SHG', pistol: 'PST', launcher: 'LNC', melee: 'MEL' },
  _spins: {}, _spinQ: [],
  // categories the selected loadout slot takes
  slotCats(g, i) { const d = LOADOUT.slotDef(g, i); return d && d.cats ? d.cats : []; },

  init() {
    if (this.el) return;
    const st = document.createElement('style'); st.textContent = ARM_CSS; document.head.appendChild(st);
    const d = document.createElement('div'); d.id = 'armory'; d.className = 'hidden';
    d.innerHTML = `<div class="armTop"><h2>ARM<b>ORY</b></h2><div class="armLv" id="armLv"></div><div class="sp"></div><button class="btn sub rnd" id="armRandom" title="Fill every slot with a random unlocked weapon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/><circle cx="16" cy="8" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="8" cy="16" r="1.6" fill="currentColor"/><circle cx="16" cy="16" r="1.6" fill="currentColor"/></svg><span>RANDOM PICK</span></button><button class="btn sub" id="armClose">BACK TO MENU</button></div>
      <div id="armLoadBar"></div>
      <div class="armBody">
        <div class="armLeft"><div class="grpTitle">LOADOUT</div><div id="armSlots"></div>
          <div style="font-size:10px;color:#7d8795;line-height:1.4;margin-top:4px">Pick a slot, choose a weapon, then EQUIP. Used in every mode.</div></div>
        <div class="armMid"><div id="armView"><div class="fx"></div><div id="armName"></div><div id="armLock" class="hidden"></div><div class="rot">DRAG TO ROTATE · SCROLL TO ZOOM</div><div id="armEquip"></div></div>
          <div id="armInfo"><div id="armStats"></div><div id="armAtt"></div></div>
          <div id="armPick" class="hidden"><div class="pickHead"><span id="armPickTitle"></span><button type="button" id="armPickX" aria-label="Close">✕</button></div><div id="armPickList"></div><div class="pagerBar" id="armPickBar"></div></div></div>
        <div class="armRight"><div id="armTabs"></div><div id="armCatTitle"></div><div id="armGrid"></div><div class="pagerBar" id="armGridBar"></div></div>
      </div>
      <div id="armSub"><button type="button" data-s="w" class="active">WEAPONS</button><button type="button" data-s="a">ATTACHMENTS</button><button type="button" data-s="l">LOADOUT</button></div>`;
    d.dataset.sub = 'w';
    document.body.appendChild(d);
    this.el = d; this.view = d.querySelector('#armView');
    d.querySelector('#armClose').onclick = () => { SFX.armClick(); this.hide(); };
    d.querySelector('#armRandom').onclick = () => this.randomPick();
    this.gridPager = new Pager(d.querySelector('#armGrid'), d.querySelector('#armGridBar'), { always: true });
    const go0 = this.gridPager.go.bind(this.gridPager); this.gridPager.go = (pg) => { go0(pg); this._queueSpins(); };
    this.pickPager = new Pager(d.querySelector('#armPickList'), d.querySelector('#armPickBar'), { always: true });
    d.querySelector('#armPickX').onclick = () => { SFX.armClick(); this._closePick(); };
    d.querySelector('#armSub').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; SFX.armClick(); this._closePick(); this.sub = b.dataset.s; this._renderSub(); });
    UIFIT.onChange(() => { if (this.open) { this._closePick(); this.render(); } });
    d.querySelector('#armEquip').addEventListener('pointerdown', (e) => e.stopPropagation());
    // rotate by hand, zoom with the wheel
    // one finger / the mouse turns the weapon, two fingers pinch to zoom
    const ptr = this.ptrs = new Map();
    this.view.addEventListener('pointerdown', (e) => { ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.drag = { x: e.clientX, y: e.clientY }; this.auto = false; this.autoT = 2.5; this.view.classList.add('drag'); try { this.view.setPointerCapture(e.pointerId); } catch (err) { } if (ptr.size === 2) { const [a, b] = [...ptr.values()]; this.pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
    this.view.addEventListener('pointermove', (e) => {
      const q = ptr.get(e.pointerId); if (!q) return;
      if (ptr.size >= 2) { q.x = e.clientX; q.y = e.clientY; const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (this.pinch > 0) this.zoom = clamp(this.zoom * this.pinch / Math.max(8, d), 0.45, 1.6); this.pinch = d; return; }
      if (!this.drag) return; this.yaw += (e.clientX - this.drag.x) * 0.009; this.pitch = clamp(this.pitch + (e.clientY - this.drag.y) * 0.006, -1.1, 1.1); this.drag.x = e.clientX; this.drag.y = e.clientY; q.x = e.clientX; q.y = e.clientY;
    });
    const up = (e) => { ptr.delete(e.pointerId); this.pinch = 0; if (!ptr.size) { this.drag = null; this.view.classList.remove('drag'); } else { const [a] = [...ptr.values()]; this.drag = { x: a.x, y: a.y }; } };
    this.view.addEventListener('pointerup', up); this.view.addEventListener('pointercancel', up);
    this.view.addEventListener('wheel', (e) => { e.preventDefault(); e.stopPropagation(); this.zoom = clamp(this.zoom * (e.deltaY > 0 ? 1.1 : 0.9), 0.45, 1.6); }, { passive: false });
    document.addEventListener('keydown', (e) => { if (this.open && e.code === 'Escape') { e.stopPropagation(); if (this.pick) this._closePick(); else this.hide(); } }, true);
    // entry points in the main menu
    const top = document.querySelector('#menuTop .topBtns');
    if (top) {
      const b = document.createElement('button'); b.className = 'iconBtn'; b.id = 'armoryBtn';
      b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2 9h13l2-2h5v4h-3l-1 2h-5l-1 5H8l1-5H5l-1 2H2z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg><span>ARMORY</span>';
      b.onclick = () => this.show(); top.insertBefore(b, top.firstChild);
    }
    const play = document.getElementById('playBtn');
    if (play) { const b = document.createElement('button'); b.className = 'btn sub'; b.id = 'armoryBtn2'; b.textContent = 'ARMORY · LOADOUT'; b.onclick = () => this.show(); play.parentNode.insertBefore(b, play); }
  },

  show() {
    if (!ARSENAL.ready || !ARSENAL.weapons.length || G.playing) return;
    this.init(); initAudio(); SFX.uiConfirm();
    this.open = true; this.el.classList.remove('hidden'); document.getElementById('menu').classList.add('hidden'); document.body.classList.add('armoryOpen');
    if (!this.sel || !ARSENAL.byId[this.sel]) this.sel = LOADOUT.primary[0] || ARSENAL.weapons[0].id;
    this.cat = ARSENAL.byId[this.sel].category; this.auto = true; this.zoom = 1; this.pitch = 0.1;
    const sd = LOADOUT.slotFor(this.cat); if (sd) this.slot = { g: sd.g, i: sd.i };
    this._queueThumbs(); this.render();
    setTimeout(() => { if (this.open) this._layoutGrid(); }, 120);   // fonts / scale settle after the first paint
  },
  hide() {
    if (!this.open) return;
    this.open = false; this._closePick(); this.el.classList.add('hidden'); document.getElementById('menu').classList.remove('hidden'); document.body.classList.remove('armoryOpen');
    LOADOUT.save(); if (typeof PROGRESSION !== 'undefined') PROGRESSION.markViewed();
    this._setObj(null); SFX.uiBack();
  },

  // ---------- panels ----------
  slotId(g, i) { return LOADOUT.get(g, i); },
  // every slot gets a random unlocked weapon of its own type
  randomPick() {
    LOADOUT.randomize(); SFX.armRandom();
    const rb = this.el.querySelector('#armRandom'); rb.classList.remove('roll'); void rb.offsetWidth; rb.classList.add('roll');
    this._pop = 'all';
    const id = this.slotId(this.slot.g, this.slot.i);
    if (id && ARSENAL.byId[id]) { this.sel = id; this.cat = ARSENAL.byId[id].category; }
    this._queueThumbs(); this._closePick(); this.render();
  },
  render() { this._renderSub(); this._renderSlots(); this._renderTabs(); this._renderGrid(); this._renderInfo(); this._renderLevel(); },
  // compact layout: one panel at a time beside / under the showcase
  _renderSub() {
    if (this.sub === 'l') this.sub = 'w';   // the loadout strip above shows (and picks) every slot
    this.el.dataset.sub = this.sub;
    for (const b of this.el.querySelectorAll('#armSub button')) b.classList.toggle('active', b.dataset.s === this.sub);
    const hint = this.el.querySelector('.rot'); if (hint) hint.textContent = UIFIT.touch ? 'DRAG TO ROTATE · PINCH TO ZOOM' : 'DRAG TO ROTATE · SCROLL TO ZOOM';
    if (this.gridPager) this.gridPager.layout();
  },
  _renderLevel() {
    const el = this.el.querySelector('#armLv');
    if (typeof PROGRESSION === 'undefined' || !PROGRESSION.state) { el.textContent = ''; return; }
    const I = PROGRESSION.levelInfo(), n = ARSENAL.weapons.filter(e => ARSENAL.isUnlocked(e.id)).length;
    el.innerHTML = `LEVEL <b>${I.level}</b> · ${I.max ? 'MAX' : Math.round(I.into) + ' / ' + I.need + ' XP'} · <b>${n}</b> / ${ARSENAL.weapons.length} WEAPONS UNLOCKED`;
  },
  // the full loadout as one horizontal strip: primaries | secondaries | melee, launcher | grenades
  _renderBar() {
    const bar = this.el.querySelector('#armLoadBar'); if (!bar) return;
    bar.innerHTML = '';
    let lastG = '';
    const grp = (g) => g === 'primary' ? 'p' : g === 'secondary' ? 's' : g === 'melee' || g === 'launcher' ? 'm' : 'g';
    for (const sl of LOADOUT_SLOTS) {
      const { g, i } = sl, id = this.slotId(g, i);
      if (lastG && grp(g) !== lastG) { const sp = document.createElement('i'); sp.className = 'lbSep'; bar.appendChild(sp); }
      lastG = grp(g);
      const e = !sl.gren && id ? ARSENAL.byId[id] : null, filled = sl.gren ? !!id : !!e;
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'lbT' + (this.slot.g === g && this.slot.i === i ? ' active' : '') + (filled ? '' : ' empty') + (this._pop === 'all' || this._pop === g + i ? ' pop' : '');
      let pic = '', name;
      if (sl.gren) { name = (EQUIP.TYPES[id] || EQUIP.TYPES.frag).label + ' ×' + EQUIP.max; pic = IW_ICON[id] || IW_ICON.frag || ''; }
      else { name = e ? e.name : 'EMPTY'; if (e && ARSENAL.thumb(id)) pic = `<img alt="" src="${ARSENAL.thumb(id)}">`; }
      const short = { primary: 'PRI ' + (i + 1), secondary: 'SEC ' + (i + 1), melee: 'MELEE', launcher: 'LAUNCH', lethal: 'LETHAL', tactical: 'TACT' }[g];
      b.innerHTML = `<small><kbd>${sl.key}</kbd>${UIFIT.rsp ? short : sl.label}</small><div class="lbPic">${pic}</div><b>${name}</b><i class="lbTick">${ARM_TICK}</i>`;
      b.title = sl.label + (filled ? ': ' + name : '');
      b.onclick = () => this.el.querySelector(`#armSlots .armLoad[data-k="${g}${i}"]`).click();
      bar.appendChild(b);
    }
    this._pop = null;
    const act = bar.querySelector('.lbT.active'); if (act && UIFIT.rsp) act.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  },
  _renderSlots() {
    const box = this.el.querySelector('#armSlots'); box.innerHTML = '';
    const GROUPS = { primary: 'PRIMARY', secondary: 'SECONDARY', melee: 'THROWABLES & MELEE' };
    for (const sl of LOADOUT_SLOTS) {
      const { g, i } = sl;
      if (GROUPS[g] && i === 0) { const t = document.createElement('div'); t.className = 'armGrp'; t.innerHTML = `<span>${GROUPS[g]}</span>`; box.appendChild(t); }
      const id = this.slotId(g, i), b = document.createElement('button');
      b.className = 'armLoad' + (this.slot.g === g && this.slot.i === i ? ' active' : ''); b.dataset.k = g + i;
      const what = sl.gren ? (g === 'lethal' ? 'GRENADE' : 'GRENADE ↻') : sl.cats.map(c => ARSENAL.cat(c).short).join(' / ');
      let name, pic = '';
      if (sl.gren) { name = (EQUIP.TYPES[id] || EQUIP.TYPES.frag).label + ' ×' + EQUIP.max; pic = `<div class="ico">${IW_ICON[id] || IW_ICON.frag}</div>`; }
      else { name = id && ARSENAL.byId[id] ? ARSENAL.byId[id].name : 'EMPTY'; if (id && ARSENAL.thumb(id)) pic = `<img alt="" src="${ARSENAL.thumb(id)}">`; }
      b.innerHTML = `<div class="tx"><small>${sl.label} · ${what}</small><b>${name}</b></div>${pic}<kbd>${sl.key}</kbd>`;
      b.title = sl.gren ? (sl.gren.length > 1 ? 'Click to change the grenade' : 'Lethal grenade') : sl.label + ': ' + sl.cats.map(c => ARSENAL.cat(c).label).join(' or ');
      b.onclick = () => {
        SFX.armClick();
        if (sl.gren) { if (sl.gren.length > 1) { LOADOUT.set(g, 0, sl.gren[(sl.gren.indexOf(LOADOUT[g]) + 1) % sl.gren.length]); SFX.armSelect(); this._pop = g + i; } this.slot = { g, i }; this._renderSlots(); this._renderTabs(); return; }
        this.slot = { g, i };
        if (id && ARSENAL.byId[id]) { this.sel = id; this.cat = ARSENAL.byId[id].category; }
        else if (!sl.cats.includes(this.cat)) this.cat = sl.cats[0];
        this._closePick(); this.render();
      };
      box.appendChild(b);
    }
    this._renderBar();
  },
  _renderTabs() {
    const box = this.el.querySelector('#armTabs'); box.innerHTML = '';
    const ok = this.slotCats(this.slot.g, this.slot.i);
    for (const c of ARSENAL.CATS) {
      const b = document.createElement('button'); b.textContent = UIFIT.rsp ? this.TAB3[c.key] : c.short; b.title = c.label + ' · ' + this._slotName(c.key);
      b.className = (c.key === this.cat ? 'active' : '') + (ok.includes(c.key) && c.key !== this.cat ? ' slot' : '');
      b.onclick = () => {
        SFX.armClick(); this.cat = c.key;
        // Keep the selected loadout slot when it accepts this category.
        const sd = this.targetSlot(c.key); if (sd) this.slot = { g: sd.g, i: sd.i };
        const cur = sd && this.slotId(sd.g, sd.i), first = ARSENAL.list(c.key)[0];
        this.sel = cur && ARSENAL.byId[cur] && ARSENAL.byId[cur].category === c.key ? cur : first ? first.id : this.sel;
        this._closePick(); this._renderSlots(); this._renderTabs(); this._renderGrid(); this._renderInfo();
      };
      box.appendChild(b);
    }
    const list = ARSENAL.list(this.cat), n = list.filter(e => ARSENAL.isUnlocked(e.id)).length;
    this.el.querySelector('#armCatTitle').innerHTML = `<span>${ARSENAL.cat(this.cat).label} · ${this._slotName(this.cat)}</span><span>${n} / ${list.length} UNLOCKED</span>`;
  },
  targetSlot(cat) {
    const selected = LOADOUT.slotDef(this.slot.g, this.slot.i);
    return selected && selected.cats && selected.cats.includes(cat) ? selected : LOADOUT.slotFor(cat);
  },
  _slotName(cat) { const d = this.targetSlot(cat); return d ? d.label : ''; },
  _renderGrid() {
    const box = this.el.querySelector('#armGrid'); box.innerHTML = '';
    const equipped = new Set(LOADOUT.ids());
    for (const e of ARSENAL.list(this.cat)) {
      const un = ARSENAL.isUnlocked(e.id), c = document.createElement('div');
      c.className = 'armCard' + (e.id === this.sel ? ' sel' : '') + (un ? '' : ' locked') + (equipped.has(e.id) ? ' eq' : ''); c.dataset.id = e.id;
      const t = ARSENAL.thumb(e.id);
      const req = un ? e.desc : ARSENAL.requirement(e.id);
      const tag = equipped.has(e.id) ? '<span class="tag eq">EQUIPPED</span>' : !un ? '<span class="tag lock">LOCKED</span>' : (typeof PROGRESSION !== 'undefined' && PROGRESSION.isNew(e.id) ? '<span class="tag new">NEW</span>' : '');
      const prog = !un && typeof PROGRESSION !== 'undefined' ? `<i class="prog" style="width:${(PROGRESSION.progress(e) * 100).toFixed(0)}%"></i>` : '';
      c.innerHTML = this._cardPic(e.id) + `<b>${e.name}</b><small>${req}</small>${tag}${prog}` + (equipped.has(e.id) ? `<i class="tick">${ARM_TICK}</i>` : '');
      c.onclick = () => { SFX.armClick(); this.sel = e.id; this._closePick(); this._renderGrid(); this._renderInfo(); };
      c.ondblclick = () => { if (ARSENAL.isUnlocked(e.id)) this.equip(); };
      box.appendChild(c);
    }
    this._layoutGrid(ARSENAL.list(this.cat).findIndex(e => e.id === this.sel));
  },
  // two columns while the category fits in three pages, else three (smaller cards), else four
  _layoutGrid(focus) {
    const P = this.gridPager, box = this.el.querySelector('#armGrid'); if (!P) return;
    for (const gc of UIFIT.rsp ? [2, 3] : [2, 3, 4]) {
      box.style.setProperty('--gc', gc); box.classList.toggle('dense', gc > 2);
      P.layout(focus);
      if (P.pages.length <= 3) break;
    }
    this._queueSpins();
  },
  // ---------- 360-degree turntables of the cards on the page (desktop) ----------
  _spinOn() { return !UIFIT.rsp && !UIFIT.touch; },
  _cardPic(id) {
    const sp = this._spins[id];
    if (sp && this._spinOn()) return `<div class="spin" data-id="${id}" style="background-image:url(${sp.url});background-size:${sp.n * 100}% 100%;background-position:${this._spinPos(sp.n)}"></div>`;
    const t = ARSENAL.thumb(id); return t ? `<img alt="" src="${t}">` : '<div class="ph"></div>';
  },
  _spinPos(n) { return (this._spinF % n) / (n - 1) * 100 + '% 0'; },
  _queueSpins() {
    if (!this._spinOn()) return;
    const ids = [...this.el.querySelectorAll('#armGrid .armCard:not(.pgHide)')].map(c => c.dataset.id).filter(id => !this._spins[id] && !this._spinQ.includes(id));
    this._spinQ.unshift(...ids);
  },
  _spinF: 0, _spinT: 0,
  _animSpins(dt) {
    if (!this._spinOn()) return;
    this._spinT += dt;
    const f = Math.floor(this._spinT * this.SPIN_N / this.SPIN_PERIOD);
    if (f === this._spinF) return;
    this._spinF = f;
    for (const el of this.el.querySelectorAll('#armGrid .spin')) { const sp = this._spins[el.dataset.id]; if (sp) el.style.backgroundPosition = this._spinPos(sp.n); }
  },
  SPIN_N: 48, SPIN_PERIOD: 7,
  // one weapon turning through 360 degrees: SPIN_N frames rendered at 2x into one tiled target, averaged down to 1x on
  // the GPU (no MSAA resolves, a small read-back) and laid out as a strip that the cards step through (_animSpins).
  // ~10 ms on the main thread; the image is encoded off-thread. Returns a promise of { url, n } (object URL).
  spinStrip(id, w, h) {
    this._scene();
    const n = this.SPIN_N, cols = 8, rows = Math.ceil(n / cols), r = renderer, W = w * 2, H = h * 2;
    const mk = (x, y) => new THREE.WebGLRenderTarget(x, y, { format: THREE.RGBAFormat, encoding: THREE.sRGBEncoding, depthBuffer: true });
    if (!this._srt || this._srt.width !== cols * W || this._srt.height !== rows * H) {
      if (this._srt) { this._srt.dispose(); this._srt1.dispose(); }
      this._srt = mk(cols * W, rows * H); this._srt1 = mk(cols * w, rows * h); this._srt1.depthBuffer = false;
    }
    let root;
    try { root = GUNSMITH.build(ARSENAL.byId[id], ARSENAL.kitFor(id)).root; } catch (err) { console.warn('spin', id, err); return null; }
    const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    root.position.sub(c);
    const hold = this.obj; if (hold) hold.visible = false;
    this.pivot.add(root);
    const cam = this._scam || (this._scam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10));
    // the same scale at every angle: the widest the weapon can look while it turns
    const a = W / H, halfW = Math.hypot(size.x, size.z) * 0.5 * 1.03 + 0.004, halfH = Math.max(size.y * 0.62 + 0.004, halfW / a);
    cam.left = -halfH * a; cam.right = halfH * a; cam.top = halfH; cam.bottom = -halfH; cam.updateProjectionMatrix();
    this.scene.environment = scene.environment;
    const rt = this._srt, rt1 = this._srt1, tm = r.toneMapping, prev = r.getRenderTarget(); r.getClearColor(_armC); const ca = r.getClearAlpha();
    r.toneMapping = THREE.NoToneMapping; r.setClearColor(0x000000, 0);
    rt.viewport.set(0, 0, rt.width, rt.height); rt.scissorTest = false; r.setRenderTarget(rt); r.clear(true, true, true);
    const pitch = 0.16;
    for (let i = 0; i < n; i++) {
      const ya = Math.PI / 2 + i / n * Math.PI * 2, x = (i % cols) * W, y = (rows - 1 - Math.floor(i / cols)) * H;
      cam.position.set(Math.sin(ya) * Math.cos(pitch) * 3, Math.sin(pitch) * 3, Math.cos(ya) * Math.cos(pitch) * 3); cam.lookAt(0, 0, 0);
      rt.viewport.set(x, y, W, H); rt.scissor.set(x, y, W, H); rt.scissorTest = true; r.setRenderTarget(rt);
      r.render(this.scene, cam);
    }
    rt.viewport.set(0, 0, rt.width, rt.height); rt.scissor.set(0, 0, rt.width, rt.height); rt.scissorTest = false;
    // 2x2 average (bilinear tap at the shared corner), un-premultiplied so the anti-aliased edges keep their colour
    if (!this._dq) {
      const m = new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, depthTest: false, depthWrite: false,
        vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'uniform sampler2D t; varying vec2 v; void main(){ vec4 c = texture2D(t, v); gl_FragColor = vec4(c.a > 0.004 ? c.rgb / c.a : vec3(0.0), c.a); }' });
      this._dq = new THREE.Scene(); this._dq.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m)); this._dqC = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); this._dqM = m;
    }
    this._dqM.uniforms.t.value = rt.texture;
    rt1.viewport.set(0, 0, rt1.width, rt1.height); r.setRenderTarget(rt1); r.render(this._dq, this._dqC);
    const RW = rt1.width, RH = rt1.height, px = new Uint8Array(RW * RH * 4);
    const finish = () => {
      const big = this._c2 || (this._c2 = document.createElement('canvas')); big.width = RW; big.height = RH;
      const bx = big.getContext('2d'), im = bx.createImageData(RW, RH);
      for (let row = 0; row < RH; row++) im.data.set(px.subarray((RH - 1 - row) * RW * 4, (RH - row) * RW * 4), row * RW * 4);
      bx.putImageData(im, 0, 0);
      const out = document.createElement('canvas'); out.width = n * w; out.height = h;
      const ox = out.getContext('2d');
      for (let i = 0; i < n; i++) ox.drawImage(big, (i % cols) * w, Math.floor(i / cols) * h, w, h, i * w, 0, w, h);
      return new Promise(res => out.toBlob(b => res(b ? { url: URL.createObjectURL(b), n } : null), 'image/webp', 0.92));
    };
    const gl = r.getContext();
    let done;
    if (r.capabilities.isWebGL2 && gl.fenceSync) {
      // WebGL2: read into a pixel buffer and collect it once the GPU has finished (no stall on the main thread)
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf); gl.bufferData(gl.PIXEL_PACK_BUFFER, px.byteLength, gl.STREAM_READ);
      gl.readPixels(0, 0, RW, RH, gl.RGBA, gl.UNSIGNED_BYTE, 0);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
      done = new Promise(res => {
        const poll = () => {
          const st = gl.clientWaitSync(sync, 0, 0);
          if (st === gl.TIMEOUT_EXPIRED) { setTimeout(poll, 8); return; }
          gl.deleteSync(sync);
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, px); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); gl.deleteBuffer(buf);
          res(finish());
        };
        setTimeout(poll, 8);
      });
    } else { r.readRenderTargetPixels(rt1, 0, 0, RW, RH, px); done = finish(); }
    r.setRenderTarget(prev); r.setClearColor(_armC, ca); r.toneMapping = tm;
    this.pivot.remove(root); this._dispose(root); if (hold) hold.visible = true;
    return done;
  },
  _pumpSpins() {
    if (!this._spinQ.length || this._spinBusy || !this._spinOn()) return;
    const id = this._spinQ.shift(); if (this._spins[id] || !ARSENAL.byId[id]) return;
    const p = this.spinStrip(id, 240, 106); if (!p) return;
    this._spinBusy = true;
    p.then(sp => {
      this._spinBusy = false; if (!sp) return;
      this._spins[id] = sp;
      const card = this.el.querySelector(`#armGrid .armCard[data-id="${id}"]`);
      if (card) { const old = card.querySelector('img,.ph,.spin'); if (old) { const t = document.createElement('div'); t.innerHTML = this._cardPic(id); old.replaceWith(t.firstChild); } }
    });
  },
  _renderInfo() {
    const e = ARSENAL.byId[this.sel]; if (!e) return;
    const d = WEAPON_DEFS[ARSENAL.defName(e.id)], S0 = ARSENAL.stats(e.id), un = ARSENAL.isUnlocked(e.id), cat = ARSENAL.cat(e.category);
    this.el.querySelector('#armName').innerHTML = `<small>${cat.label}</small><b>${e.name}</b><span>${e.desc}</span>`;
    const lock = this.el.querySelector('#armLock'); lock.classList.toggle('hidden', un); if (!un) lock.textContent = 'LOCKED · ' + ARSENAL.requirement(e.id);
    // stats with the attachment kit applied
    const kit = ARSENAL.kitFor(e.id), K = this._kitMods(kit);
    const bar = (label, v) => `<div class="armBar"><span>${label}</span><i><b style="width:${clamp(v, 3, 100)}%"></b></i><em>${Math.round(clamp(v, 0, 100))}</em></div>`;
    let html = bar('DAMAGE', S0.damage) + bar('FIRE RATE', S0.fireRate) + bar('RANGE', S0.range * (K.sup ? 0.92 : 1)) + bar('ACCURACY', S0.accuracy + K.acc) + bar('MOBILITY', S0.mobility + K.mob) + bar('CONTROL', S0.control + K.ctl);
    const mag = Math.max(1, Math.round(d.mag * K.cap));
    html += e.category === 'melee' ? `<div id="armNums">DAMAGE <b>${Math.round(d.dmg * 1.4)}</b> · SWINGS <b>${d.rpm}</b> / MIN</div>`
      : `<div id="armNums">DMG <b>${d.dmg}${d.pellets ? '×' + d.pellets : ''}</b> · RPM <b>${d.rpm}</b> · MAG <b>${mag}</b><br>RELOAD <b>${(d.reload * K.rel).toFixed(1)} s${d.shells ? ' / ROUND' : ''}</b> · ${d.auto ? 'AUTOMATIC' : d.bolt ? 'BOLT ACTION' : d.pump ? 'PUMP ACTION' : 'SEMI-AUTO'}</div>`;
    this.el.querySelector('#armStats').innerHTML = html;
    // attachment slots
    const A = this.el.querySelector('#armAtt'), slots = ARSENAL.slots(e.id);
    A.innerHTML = `<div class="grpTitle" style="margin:0 0 6px">ATTACHMENTS${slots.length ? '' : ' · NONE FOR THIS WEAPON'}</div><div class="row"></div><div id="armAttDesc"></div>`;
    const row = A.querySelector('.row');
    for (const s of slots) {
      const a = kit[s] && ARSENAL.attById[kit[s]], b = document.createElement('button');
      b.className = 'armSlotB' + (a ? '' : ' none'); b.innerHTML = `<small>${ARSENAL.SLOT_LABEL[s]}</small><b>${a ? a.name : 'NONE'}</b>`;
      b.onmouseenter = () => { A.querySelector('#armAttDesc').textContent = a ? a.desc : 'Empty slot. Click to choose.'; };
      b.onclick = () => { SFX.armClick(); this._openPick(e.id, s); };
      row.appendChild(b);
    }
    // equip
    const home = this.targetSlot(e.category), slotName = home ? home.label : '', cur = !!home && this.slotId(home.g, home.i) === e.id;
    const Q = this.el.querySelector('#armEquip');
    Q.innerHTML = `<div id="armEquipNote">${!un ? 'LOCKED' : cur ? 'IN ' + slotName : 'SLOT: ' + slotName}</div><button class="btn" id="armEquipBtn">${cur ? 'EQUIPPED' : 'EQUIP'}</button>`;
    const btn = Q.querySelector('#armEquipBtn'); btn.disabled = !un || cur; btn.onclick = () => this.equip();
    this._setObj(e.id);
  },
  // rough effect of a kit on the stat bars / numbers
  _kitMods(kit) {
    const K = { acc: 0, mob: 0, ctl: 0, cap: 1, rel: 1, sup: false };
    for (const s in kit) {
      const a = ARSENAL.attById[kit[s]]; if (!a) continue;
      if (a.muzzle) { if (a.muzzle.recV) K.ctl += (1 - a.muzzle.recV) * 60; if (a.muzzle.recH) K.ctl += (1 - a.muzzle.recH) * 40; if (a.muzzle.spread) K.acc += (1 - a.muzzle.spread) * 40; if (a.muzzle.suppressed) K.sup = true; }
      if (a.under) { if (a.under.recH) K.ctl += (1 - a.under.recH) * 45; if (a.under.recV) K.ctl += (1 - a.under.recV) * 60; if (a.under.hip) K.acc += 6; if (a.under.adsSpeed) K.mob += (a.under.adsSpeed - 1) * 40; if (a.under.bipod) K.ctl += 14; }
      if (a.laser) K.acc += 8;
      if (a.mag) { K.cap *= a.mag.cap; K.rel *= a.mag.reload; if (a.mag.adsSpeed) K.mob -= 8; }
      if (a.optic && a.optic.mag >= 6) K.mob -= 5;
    }
    return K;
  },
  _openPick(id, slot) {
    const P = this.el.querySelector('#armPick'), L = this.el.querySelector('#armPickList'), cur = ARSENAL.kitFor(id)[slot] || '', e = ARSENAL.byId[id];
    this.pick = { id, slot }; L.innerHTML = '';
    this.el.querySelector('#armPickTitle').textContent = ARSENAL.SLOT_LABEL[slot] + ' · ' + e.name;
    const forced = slot === 'optic' && e.st && e.st.bolt;   // bolt-action rifles always carry a scope
    const opts = (forced ? [] : [{ id: '', name: 'NONE', desc: 'Leave the slot empty.' }]).concat(ARSENAL.compatible(id, slot));
    for (const a of opts) {
      const b = document.createElement('button'); b.className = 'opt' + (a.id === cur ? ' cur' : '');
      b.innerHTML = `<b>${a.name}</b><span>${a.desc}</span>`;
      b.onclick = () => { SFX.armSelect(); ARSENAL.setKit(id, slot, a.id || null); this.objKey = ''; delete ARSENAL._thumbs[id]; if (this._spins[id]) { URL.revokeObjectURL(this._spins[id].url); delete this._spins[id]; this._spinQ.unshift(id); } this._thumbQ.unshift(id); this._closePick(); this._renderInfo(); };
      L.appendChild(b);
    }
    P.classList.remove('hidden'); this.el.classList.add('picking');
    const fi = opts.findIndex(a => a.id === cur);
    this.pickPager.layout(fi); requestAnimationFrame(() => { if (this.pick) this.pickPager.layout(fi); });
  },
  _closePick() { this.pick = null; if (this.el) { this.el.querySelector('#armPick').classList.add('hidden'); this.el.classList.remove('picking'); } },
  equip() {
    const e = ARSENAL.byId[this.sel]; if (!e || !ARSENAL.isUnlocked(e.id)) return;
    const home = this.targetSlot(e.category); if (!home) return;
    const { g, i } = home; this.slot = { g, i };
    LOADOUT.set(g, i, e.id); if (typeof PROGRESSION !== 'undefined') PROGRESSION.markViewed(e.id);
    SFX.armSelect(); this._pop = g + i; this.render();
  },

  // ---------- 3D showcase ----------
  _scene() {
    if (this.scene) return;
    this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(26, 2, 0.02, 20);
    this.scene.add(new THREE.HemisphereLight(0xd6e0f0, 0x2a2622, 0.5));
    const k = new THREE.DirectionalLight(0xfff4e6, 2.1); k.position.set(1.6, 2.4, 2.2); this.scene.add(k);
    const r = new THREE.DirectionalLight(0x9cc0ff, 0.9); r.position.set(-2, 1.2, -2.2); this.scene.add(r);
    const f = new THREE.DirectionalLight(0xffffff, 0.35); f.position.set(-1.5, -0.6, 2); this.scene.add(f);
    this.pivot = new THREE.Group(); this.scene.add(this.pivot);
  },
  _dispose(o) { if (o) o.traverse(m => { if (m.isMesh && m.geometry) m.geometry.dispose(); }); },
  _setObj(id) {
    this._scene();
    const key = id ? id + '|' + JSON.stringify(ARSENAL.kitFor(id)) : '';
    if (key === this.objKey) return;
    this.objKey = key;
    if (this.obj) { this.pivot.remove(this.obj); this._dispose(this.obj); this.obj = null; }
    if (!id) return;
    try {
      const root = GUNSMITH.build(ARSENAL.byId[id], ARSENAL.kitFor(id)).root;
      const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      root.position.sub(c); root.traverse(o => { if (o.name === 'reticle') o.material = o.material.clone(), o.material.opacity = 0.9; });
      // parts that only appear during a reload stay hidden; an unloaded launcher shows its rocket
      this.obj = root; this.objR = Math.max(0.12, size.length() / 2); this.pivot.add(root);
    } catch (err) { console.warn('armory preview', id, err); }
  },
  _aim(cam, r, yaw, pitch, zoom, aspect) {
    cam.aspect = aspect; const fit = r / Math.sin(cam.fov * Math.PI / 360) * (aspect < 1.6 ? 1.6 / aspect : 1) * 0.74 * zoom;
    cam.position.set(Math.sin(yaw) * Math.cos(pitch) * fit, Math.sin(pitch) * fit, Math.cos(yaw) * Math.cos(pitch) * fit);
    cam.lookAt(0, 0, 0); cam.near = Math.max(0.01, fit - r * 1.5); cam.far = fit + r * 2; cam.updateProjectionMatrix();
  },
  // called at the end of every frame while the Armory is open
  draw(dt) {
    if (!this.open) return;
    this._pumpThumbs(); if (!this._thumbQ.length) this._pumpSpins(); this._animSpins(dt);
    if (!this.obj) return;
    if (!this.drag) { if (this.autoT > 0) this.autoT -= dt; else this.auto = true; }
    if (this.auto) { this.yaw += dt * 0.55; this.pitch = damp(this.pitch, 0.1, 2, dt); }
    const el = this.view.getBoundingClientRect(); if (el.width < 4 || el.height < 4) return;
    this.scene.environment = scene.environment;
    this._aim(this.cam, this.objR, this.yaw, this.pitch, this.zoom, el.width / el.height);
    const r = renderer, y = innerHeight - el.bottom, tm = r.toneMapping;
    r.setRenderTarget(null); r.toneMapping = THREE.NoToneMapping;
    r.setViewport(el.left, y, el.width, el.height); r.setScissor(el.left, y, el.width, el.height); r.setScissorTest(true);
    r.autoClear = false; r.getClearColor(_armC); const ca = r.getClearAlpha(); r.setClearColor(0x0d1117, 1); r.clear(true, true, false);
    r.render(this.scene, this.cam);
    r.setClearColor(_armC, ca); r.setScissorTest(false); r.setViewport(0, 0, innerWidth, innerHeight); r.autoClear = true; r.toneMapping = tm;
  },

  // ---------- thumbnails ----------
  _queueThumbs() {
    const have = new Set(this._thumbQ);
    const order = [...LOADOUT.ids(), ...ARSENAL.list(this.cat).map(e => e.id), ...ARSENAL.weapons.map(e => e.id)];
    for (const id of order) if (!ARSENAL._thumbs[id] && !have.has(id)) { this._thumbQ.push(id); have.add(id); }
  },
  _pumpThumbs() {
    if (!this._thumbQ.length) return;
    const t0 = performance.now(); let done = 0;
    while (this._thumbQ.length && performance.now() - t0 < 9) {
      const id = this._thumbQ.shift(); if (ARSENAL._thumbs[id] || !ARSENAL.byId[id]) continue;
      ARSENAL._thumbs[id] = this.thumb(id, 300, 132); done++;
    }
    if (done) { this._renderGridImages(); if (!this._thumbQ.length || done) this._renderSlots(); if (this.gridPager) this.gridPager.layout(); }
  },
  _renderGridImages() {
    for (const c of this.el.querySelectorAll('.armCard')) {
      const t = ARSENAL.thumb(c.dataset.id), ph = c.querySelector('.ph');
      if (t && ph) { const im = document.createElement('img'); im.alt = ''; im.src = t; ph.replaceWith(im); }
    }
  },
  // side view of a weapon (muzzle to the right) rendered off-screen at 2x and scaled down; returns a PNG data URL
  thumb(id, w, h, kit, yaw, pitch) {
    this._scene();
    const W = w * 2, H = h * 2;
    if (!this._rt || this._rt.width !== W || this._rt.height !== H) { if (this._rt) this._rt.dispose(); this._rt = new THREE.WebGLRenderTarget(W, H, { format: THREE.RGBAFormat, encoding: THREE.sRGBEncoding }); }
    let root;
    try { root = GUNSMITH.build(ARSENAL.byId[id], kit || ARSENAL.kitFor(id)).root; } catch (err) { console.warn('thumb', id, err); return ''; }
    const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    root.position.sub(c);
    const hold = this.obj; if (hold) hold.visible = false;
    this.pivot.add(root);
    const cam = this._tcam || (this._tcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10));
    // fit the silhouette (length along Z, height Y) into the frame
    const a = W / H, halfH = Math.max(size.y * 0.5, size.z * 0.5 / a) * 1.12 + 0.004, ya = yaw === undefined ? Math.PI / 2 : yaw, pa = pitch || 0;
    cam.left = -halfH * a; cam.right = halfH * a; cam.top = halfH; cam.bottom = -halfH;
    cam.position.set(Math.sin(ya) * Math.cos(pa) * 3, Math.sin(pa) * 3, Math.cos(ya) * Math.cos(pa) * 3); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    this.scene.environment = scene.environment;
    const r = renderer, tm = r.toneMapping, prev = r.getRenderTarget(); r.getClearColor(_armC); const ca = r.getClearAlpha();
    r.toneMapping = THREE.NoToneMapping; r.setRenderTarget(this._rt); r.setClearColor(0x000000, 0); r.clear(true, true, true);
    r.render(this.scene, cam);
    const px = new Uint8Array(W * H * 4); r.readRenderTargetPixels(this._rt, 0, 0, W, H, px);
    r.setRenderTarget(prev); r.setClearColor(_armC, ca); r.toneMapping = tm;
    this.pivot.remove(root); this._dispose(root); if (hold) hold.visible = true;
    // flip rows, then scale down for anti-aliasing
    const big = this._c1 || (this._c1 = document.createElement('canvas')); big.width = W; big.height = H;
    const bx = big.getContext('2d'), im = bx.createImageData(W, H);
    for (let row = 0; row < H; row++) im.data.set(px.subarray((H - 1 - row) * W * 4, (H - row) * W * 4), row * W * 4);
    bx.putImageData(im, 0, 0);
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const ox = out.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(big, 0, 0, w, h);
    return out.toDataURL('image/png');
  }
};
const _armC = new THREE.Color();
const ARM_TICK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 8.4l3 3 6.6-7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
