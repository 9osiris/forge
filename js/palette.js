/* cmd+k command palette */
(function(){
"use strict";
const S = window.ForgeStore;

let sel = 0, items = [];

function open(){
  document.getElementById("palette").classList.remove("palette-hidden");
  const inp = document.getElementById("paletteInput");
  inp.value = "";
  render("");
  setTimeout(()=>inp.focus(), 30);
  sel = 0;
}

function close(){
  document.getElementById("palette").classList.add("palette-hidden");
}

function isOpen(){
  return !document.getElementById("palette").classList.contains("palette-hidden");
}

function render(q){
  items = q.trim() ? S.search(q, 10) : S.data.repos.slice(0,7).map(r=>({
    type:"repo", repo:r.name, label:r.name, hint:r.description||"", path:""
  }));
  const box = document.getElementById("paletteResults");
  box.innerHTML = items.map((it,i)=>{
    return '<div class="prow'+(i===sel?" sel":"")+'" data-i="'+i+'">'+
      '<span class="pk">'+(it.type==="repo"?"repo":"file")+'</span>'+
      '<span class="pv">'+escHtml(it.label)+'</span>'+
      '<span class="ph">'+escHtml(it.hint.slice(0,40))+'</span></div>';
  }).join("") || '<div class="empty"><p>nothing found.</p></div>';
  box.querySelectorAll(".prow").forEach(el=>{
    el.addEventListener("click", ()=>go(+el.dataset.i));
    el.addEventListener("mousemove", ()=>{ sel = +el.dataset.i; paintSel(); });
  });
}

function escHtml(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

function paintSel(){
  document.querySelectorAll("#paletteResults .prow").forEach((el,i)=>{
    el.classList.toggle("sel", i === sel);
  });
  const cur = document.querySelector("#paletteResults .prow.sel");
  if(cur) cur.scrollIntoView({block:"nearest"});
}

function go(i){
  const it = items[i];
  if(!it) return;
  close();
  location.hash = it.type === "repo" ? "#/r/"+it.repo : "#/r/"+it.repo+"/blob/main/"+it.path;
}

function init(){
  const inp = document.getElementById("paletteInput");
  inp.addEventListener("input", ()=>{ sel = 0; render(inp.value); });
  inp.addEventListener("keydown", (e)=>{
    if(e.key === "ArrowDown"){ e.preventDefault(); sel = Math.min(sel+1, items.length-1); paintSel(); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); sel = Math.max(sel-1, 0); paintSel(); }
    else if(e.key === "Enter"){ go(sel); }
    else if(e.key === "Escape"){ close(); }
  });
  document.getElementById("palette").addEventListener("click", (e)=>{
    if(e.target.id === "palette") close();
  });
  document.getElementById("paletteBtn").addEventListener("click", open);
  document.addEventListener("keydown", (e)=>{
    if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"){ e.preventDefault(); isOpen() ? close() : open(); }
    else if(e.key === "Escape" && isOpen()) close();
  });
}

window.ForgePalette = { init: init, open: open, close: close };
})();
