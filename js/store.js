/* data layer: loads data.json, search index, helpers */
(function(){
"use strict";

let DATA = null;
let searchIndex = [];

const LANG_COLORS = {
  Python:"#3572A5", JavaScript:"#f1e05a", TypeScript:"#3178c6", HTML:"#e34c26",
  CSS:"#563d7c", Lua:"#000080", "C++":"#f34b7d", C:"#555555", Rust:"#dea584",
  Go:"#00ADD8", Shell:"#89e051", PowerShell:"#012456", JSON:"#cbcb41",
  Markdown:"#083fa1", YAML:"#cb171e", TOML:"#9c4221", SQL:"#e38c00", Other:"#8b8b8b"
};

function langColor(l){ return LANG_COLORS[l] || "#8b8b8b"; }

async function load(){
  const res = await fetch("data/data.json");
  if(!res.ok) throw new Error("data failed to load");
  DATA = await res.json();
  buildIndex();
  return DATA;
}

function buildIndex(){
  searchIndex = [];
  for(const r of DATA.repos){
    searchIndex.push({type:"repo", repo:r.name, path:"", text:(r.name+" "+(r.description||"")).toLowerCase(), label:r.name, hint:r.description||""});
    for(const f of r.tree){
      searchIndex.push({type:"file", repo:r.name, path:f.path, text:(r.name+" "+f.path).toLowerCase(), label:f.path, hint:r.name});
    }
  }
}

function search(q, limit){
  q = q.trim().toLowerCase();
  if(!q) return [];
  limit = limit || 12;
  const starts = [], contains = [];
  for(const item of searchIndex){
    const idx = item.text.indexOf(q);
    if(idx === -1) continue;
    let score = 1000 - idx;
    if(item.type === "repo") score += 2000;
    const base = item.label.split("/").pop().toLowerCase();
    if(base.indexOf(q) === 0) score += 500;
    (idx <= item.label.toLowerCase().indexOf(q) + 2 ? starts : contains).push({item, score});
  }
  starts.sort((a,b)=>b.score-a.score);
  contains.sort((a,b)=>b.score-a.score);
  return starts.concat(contains).slice(0, limit).map(x=>x.item);
}

function getRepo(name){
  return DATA.repos.find(r=>r.name === name) || null;
}

function timeAgo(iso){
  if(!iso) return "";
  const d = new Date(iso), now = new Date();
  const s = Math.floor((now - d)/1000);
  if(s < 60) return "just now";
  if(s < 3600) return Math.floor(s/60)+"m ago";
  if(s < 86400) return Math.floor(s/3600)+"h ago";
  if(s < 86400*30) return Math.floor(s/86400)+"d ago";
  if(s < 86400*365) return Math.floor(s/(86400*30))+"mo ago";
  return Math.floor(s/(86400*365))+"y ago";
}

function fmtDate(iso){
  if(!iso) return "";
  return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}

function fmtNum(n){
  if(n >= 1000000) return (n/1000000).toFixed(1)+"m";
  if(n >= 1000) return (n/1000).toFixed(1)+"k";
  return ""+n;
}

function avatarColor(name){
  let h = 0;
  for(const c of name) h = (h*31 + c.charCodeAt(0)) >>> 0;
  const hues = [210, 160, 25, 0, 280, 190, 45, 320];
  return "hsl("+hues[h % hues.length]+", 55%, 62%)";
}

function initials(name){
  const clean = name.replace(/[^a-zA-Z ]/g," ").trim();
  const parts = clean.split(/\s+/);
  if(parts.length >= 2) return (parts[0][0]+parts[1][0]).toUpperCase();
  return (clean.slice(0,2) || "??").toUpperCase();
}

function fileIcon(path){
  if(path.endsWith("/")) return "📁";
  const ext = (path.split(".").pop()||"").toLowerCase();
  const map = {py:"🐍", js:"📜", ts:"📜", html:"🌐", css:"🎨", md:"📝", json:"🧾",
    sh:"⚙️", lua:"🌙", c:"⚙️", cpp:"⚙️", h:"⚙️", rs:"🦀", go:"🐹", sql:"🗄️",
    txt:"📄", yml:"🧾", yaml:"🧾", toml:"🧾", png:"🖼️", jpg:"🖼️", gitignore:"🙈"};
  return map[ext] || "📄";
}

function isDirInTree(repo, dirPath){
  const prefix = dirPath ? dirPath + "/" : "";
  const items = [];
  const seen = new Set();
  for(const f of repo.tree){
    if(!f.path.startsWith(prefix)) continue;
    const rest = f.path.slice(prefix.length);
    if(!rest) continue;
    const slash = rest.indexOf("/");
    if(slash === -1){
      items.push({name: rest, path: f.path, type:"file", size: f.size});
    } else {
      const d = rest.slice(0, slash);
      if(!seen.has(d)){ seen.add(d); items.push({name: d, path: prefix+d, type:"dir"}); }
    }
  }
  items.sort((a,b)=> (a.type===b.type) ? a.name.localeCompare(b.name) : (a.type==="dir" ? -1 : 1));
  return items;
}

window.ForgeStore = {
  load, search, getRepo, timeAgo, fmtDate, fmtNum,
  langColor, avatarColor, initials, fileIcon, isDirInTree,
  get data(){ return DATA; }
};
})();
