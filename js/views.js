/* all views for the forge */
(function(){
"use strict";
const S = window.ForgeStore, MD = window.ForgeMD, HL = window.ForgeHL;

function esc(s){ return MD.esc(String(s == null ? "" : s)); }

function heatmap(activity){
  const today = new Date(); today.setHours(0,0,0,0);
  const start = new Date(today); start.setDate(start.getDate() - (26*7 + today.getDay()));
  let cells = "";
  const d = new Date(start);
  while(d <= today){
    const key = d.toISOString().slice(0,10);
    const v = activity[key] || 0;
    const lvl = v === 0 ? 0 : v < 3 ? 1 : v < 6 ? 2 : v < 10 ? 3 : 4;
    const op = [1, .28, .5, .75, 1][lvl];
    const bg = lvl === 0 ? "" : ' style="background:rgba(245,245,247,'+op+')"';
    cells += '<div class="heat-cell"'+bg+' title="'+key+': '+v+' commits"></div>';
    d.setDate(d.getDate()+1);
  }
  return '<div class="heat-grid">'+cells+'</div>' +
    '<div class="heat-legend">less <div class="heat-cell"></div><div class="heat-cell" style="background:rgba(245,245,247,.28)"></div><div class="heat-cell" style="background:rgba(245,245,247,.5)"></div><div class="heat-cell" style="background:rgba(245,245,247,.75)"></div><div class="heat-cell" style="background:rgba(245,245,247,1)"></div> more</div>';
}

function repoCard(r){
  const lang = r.language ? '<span><span class="langdot" style="background:'+S.langColor(r.language)+'"></span>'+esc(r.language)+'</span>' : '';
  return '<a class="repocard reveal" href="#/r/'+r.name+'">' +
    '<div class="rn">'+esc(r.name)+'</div>' +
    '<div class="rd">'+esc(r.description || "no description yet.")+'</div>' +
    '<div class="repometa">'+lang +
      '<span>★ '+r.stars+'</span>' +
      '<span class="mono">'+r.commit_count+' commits</span>' +
      '<span>updated '+S.timeAgo(r.updated)+'</span>' +
    '</div></a>';
}

function renderHome(){
  const D = S.data, p = D.profile;
  const langs = new Set(D.repos.map(r=>r.language).filter(Boolean));
  const langChips = ["all"].concat([...langs].sort()).map(l=>
    '<button class="fchip'+(HomeState.lang===l?" on":"")+'" data-lang="'+esc(l)+'">'+esc(l)+'</button>').join("");

  let html =
  '<div class="profile reveal">'+
    '<img src="assets/avatar.png" alt="9osiris" onerror="this.style.display=\'none\'">'+
    '<div><h1>9osiris</h1><div class="handle">@9osiris</div>'+
    (p.bio ? '<div class="bio">'+esc(p.bio)+'</div>' : '<div class="bio">ai cognitive architect. i build agents, tools, and weird experiments.</div>')+
    '<div class="pstats">'+
      '<div class="pstat"><div class="n">'+D.repos.length+'</div><div class="l">repos</div></div>'+
      '<div class="pstat"><div class="n">'+S.fmtNum(p.total_commits)+'</div><div class="l">commits</div></div>'+
      '<div class="pstat"><div class="n">'+S.fmtNum(p.total_loc)+'</div><div class="l">lines</div></div>'+
    '</div></div>'+
  '</div>'+

  '<div class="heat reveal"><p class="micro">activity · last 26 weeks</p>'+heatmap(p.activity)+'</div>'+

  '<p class="micro reveal">repositories</p>'+
  '<div class="toolbar reveal">'+
    '<input type="text" id="repoFilter" placeholder="filter repos..." value="'+esc(HomeState.q)+'">'+
    '<div class="chiprow">'+langChips+'</div>'+
    '<select id="repoSort">'+
      '<option value="updated"'+(HomeState.sort==="updated"?" selected":"")+'>recently updated</option>'+
      '<option value="name"'+(HomeState.sort==="name"?" selected":"")+'>name</option>'+
      '<option value="commits"'+(HomeState.sort==="commits"?" selected":"")+'>most commits</option>'+
      '<option value="loc"'+(HomeState.sort==="loc"?" selected":"")+'>most code</option>'+
    '</select>'+
  '</div>'+
  '<div class="repogrid" id="repoGrid"></div>';

  setTabs([]);
  return html;
}

const HomeState = { q:"", lang:"all", sort:"updated" };

function paintRepoGrid(){
  const grid = document.getElementById("repoGrid");
  if(!grid) return;
  let repos = S.data.repos.slice();
  if(HomeState.lang !== "all") repos = repos.filter(r=>r.language === HomeState.lang);
  if(HomeState.q){
    const q = HomeState.q.toLowerCase();
    repos = repos.filter(r=>(r.name+" "+(r.description||"")).toLowerCase().includes(q));
  }
  const sorts = {
    updated:(a,b)=>new Date(b.updated||0)-new Date(a.updated||0),
    name:(a,b)=>a.name.localeCompare(b.name),
    commits:(a,b)=>b.commit_count-a.commit_count,
    loc:(a,b)=>b.loc-a.loc
  };
  repos.sort(sorts[HomeState.sort] || sorts.updated);
  grid.innerHTML = repos.length ? repos.map(repoCard).join("") :
    '<div class="empty"><div class="big">🔍</div><p>nothing matches that.</p></div>';
  bindReveal();
}

function bindHome(){
  const f = document.getElementById("repoFilter");
  if(f){
    f.addEventListener("input", ()=>{ HomeState.q = f.value; paintRepoGrid(); });
  }
  document.querySelectorAll(".fchip").forEach(c=>{
    c.addEventListener("click", ()=>{
      HomeState.lang = c.dataset.lang;
      document.querySelectorAll(".fchip").forEach(x=>x.classList.remove("on"));
      c.classList.add("on");
      paintRepoGrid();
    });
  });
  const s = document.getElementById("repoSort");
  if(s) s.addEventListener("change", ()=>{ HomeState.sort = s.value; paintRepoGrid(); });
  paintRepoGrid();
}

function langBar(r){
  const entries = Object.entries(r.languages||{}).slice(0,6);
  const bar = entries.map(([l,p])=>'<span style="width:'+p+'%;background:'+S.langColor(l)+'"></span>').join("");
  const legend = entries.map(([l,p])=>'<span><span class="langdot" style="background:'+S.langColor(l)+'"></span>'+esc(l)+' '+p+'%</span>').join("");
  return '<div class="langbar">'+bar+'</div><div class="langlegend">'+legend+'</div>';
}

function repoHeader(r, active){
  const tabs = [["","overview"],["tree","files"],["commits","commits"]];
  const tabHtml = tabs.map(([k,label])=>{
    const href = k ? "#/r/"+r.name+"/"+k : "#/r/"+r.name;
    return '<a href="'+href+'" class="'+(active===k?"active":"")+'">'+label+'</a>';
  }).join("");
  return '<div class="repohead reveal">'+
    '<div class="crumbs"><a href="#/">forge</a> / <b style="color:var(--txt)">'+esc(r.name)+'</b></div>'+
    '<h1>'+esc(r.name)+
      '<span class="badge">⌀ '+esc(r.branch)+'</span>'+
      (r.stars ? '<span class="badge">★ '+r.stars+'</span>' : '')+
    '</h1>'+
    (r.description ? '<p class="repodesc">'+esc(r.description)+'</p>' : '')+
    '<div class="repoactions">'+
      '<button class="btn sm solid" data-clone="'+esc(r.github)+'">⧉ clone</button>'+
      '<a class="btn sm" href="'+esc(r.github)+'" target="_blank" rel="noopener">view on github ↗</a>'+
    '</div>'+
    langBar(r)+
  '</div>'+
  '<nav class="tabs reveal" style="max-width:none;margin:0 0 20px;padding:0">'+tabHtml+'</nav>';
}

function fileRows(r, dirPath){
  const items = S.isDirInTree(r, dirPath);
  const base = "#/r/"+r.name;
  return items.map(it=>{
    const href = it.type === "dir" ? base+"/tree/"+r.branch+"/"+it.path : base+"/blob/"+r.branch+"/"+it.path;
    const meta = it.type === "dir" ? "" : '<span class="fsize">'+fmtSize(it.size)+'</span>';
    return '<a class="frow '+(it.type==="dir"?"dir":"")+'" href="'+href+'">'+
      '<span class="fi">'+S.fileIcon(it.type==="dir" ? "dir/" : it.path)+'</span>'+
      '<span>'+esc(it.name)+'</span>'+meta+'</a>';
  }).join("") || '<div class="empty"><p>empty directory.</p></div>';
}

function fmtSize(b){
  if(b < 1024) return b+" b";
  if(b < 1024*1024) return (b/1024).toFixed(1)+" kb";
  return (b/1024/1024).toFixed(1)+" mb";
}

function commitRow(r, c, showFiles){
  const add = c.files.reduce((a,f)=>a+f.add,0), del = c.files.reduce((a,f)=>a+f.del,0);
  let filesHtml = "";
  if(showFiles && c.files.length){
    filesHtml = '<div class="commitfiles">'+c.files.slice(0,12).map(f=>
      '<div class="cfilerow"><span class="p">'+esc(f.path)+'</span>'+
      '<span class="cadd">+'+f.add+'</span><span class="cdel">-'+f.del+'</span></div>').join("")+
      (c.files.length > 12 ? '<div class="cfilerow"><span class="p" style="color:var(--mut)">+ '+(c.files.length-12)+' more files</span></div>' : "")+
    '</div>';
  }
  return '<div class="commit">'+
    '<div class="cavatar" style="background:'+S.avatarColor(c.author)+'">'+esc(S.initials(c.author))+'</div>'+
    '<div class="cbody"><div class="cmsg"><a href="#/r/'+r.name+'/commit/'+c.sha+'">'+esc(c.msg)+'</a></div>'+
    '<div class="cmeta">'+esc(c.author)+' · '+S.timeAgo(c.date)+' · <span class="mono">'+c.short+'</span></div>'+filesHtml+'</div>'+
    '<div class="cstats"><span class="cadd">+'+add+'</span> <span class="cdel">-'+del+'</span></div>'+
  '</div>';
}

function renderRepo(name){
  const r = S.getRepo(name);
  if(!r) return notFound("no repo called "+name);
  const recent = r.commits.slice(0,5);
  const html = repoHeader(r, "") +
  '<div class="split">'+
    '<div>'+
      '<div class="panel reveal"><div class="panel-h"><span>readme</span></div>'+
      '<div class="readme">'+MD.render(r.readme)+'</div></div>'+
    '</div>'+
    '<div>'+
      '<div class="panel reveal" style="margin-bottom:20px"><div class="panel-h"><span>files</span><a href="#/r/'+r.name+'/tree/'+r.branch+'">browse →</a></div>'+
        '<div class="ftree">'+fileRows(r, "").split("</a>").slice(0,8).join("</a>")+'</div></div>'+
      '<div class="panel reveal"><div class="panel-h"><span>recent commits</span><a href="#/r/'+r.name+'/commits">all →</a></div>'+
        '<div>'+recent.map(c=>commitRow(r,c,false)).join("")+'</div></div>'+
    '</div>'+
  '</div>';
  setTabs([]);
  return html;
}

function renderTree(name, branch, path){
  const r = S.getRepo(name);
  if(!r) return notFound("no repo called "+name);
  path = path || "";
  const crumbs = ['<a href="#/">forge</a>', '<a href="#/r/'+r.name+'">'+esc(r.name)+'</a>'];
  if(path){
    const parts = path.split("/");
    let acc = "";
    parts.forEach((p,i)=>{
      acc += (i?"/":"")+p;
      crumbs.push(i === parts.length-1 ? '<b style="color:var(--txt)">'+esc(p)+'</b>'
        : '<a href="#/r/'+r.name+'/tree/'+branch+'/'+acc+'">'+esc(p)+'</a>');
    });
  }
  const html = repoHeader(r, "tree") +
    '<div class="crumbs reveal">'+crumbs.join('<span class="sep">/</span>')+'</div>'+
    '<div class="panel reveal"><div class="ftree">'+fileRows(r, path)+'</div></div>';
  setTabs([]);
  return html;
}

function renderBlob(name, branch, path){
  const r = S.getRepo(name);
  if(!r) return notFound("no repo called "+name);
  const content = r.contents[path];
  const parts = path.split("/");
  const crumbs = ['<a href="#/">forge</a>', '<a href="#/r/'+r.name+'">'+esc(r.name)+'</a>'];
  let acc = "";
  parts.forEach((p,i)=>{
    acc += (i?"/":"")+p;
    crumbs.push(i === parts.length-1 ? '<b style="color:var(--txt)">'+esc(p)+'</b>'
      : '<a href="#/r/'+r.name+'/tree/'+branch+'/'+acc+'">'+esc(p)+'</a>');
  });
  let body;
  if(content == null){
    body = '<div class="empty"><div class="big">📄</div><p>file too large to preview or binary.</p>'+
      '<p style="margin-top:10px"><a class="btn sm" href="'+esc(r.github)+'/blob/'+branch+'/'+esc(path)+'" target="_blank" rel="noopener">view on github ↗</a></p></div>';
  } else {
    const lang = HL.langFor(path);
    const lines = content.split("\n");
    const codeHtml = lines.map((ln,i)=>
      '<div class="codeline"><div class="ln">'+(i+1)+'</div><div class="lc">'+HL.highlight(ln, lang)+'</div></div>').join("");
    body = '<div class="codewrap"><div class="codehead"><span class="fi">'+S.fileIcon(path)+'</span>'+
      '<span class="fname">'+esc(parts[parts.length-1])+'</span>'+
      '<span style="color:var(--mut)">'+lines.length+' lines · '+fmtSize(content.length)+'</span>'+
      '<span class="spacer"></span>'+
      '<button class="mini-btn" data-copy-target="code-'+name+'">copy</button>'+
      '<a class="mini-btn" href="'+esc(r.github)+'/blob/'+branch+'/'+esc(path)+'" target="_blank" rel="noopener" style="text-decoration:none">github ↗</a>'+
      '</div><div class="codebody" id="code-'+name+'">'+codeHtml+'</div></div>';
  }
  const html = repoHeader(r, "tree") +
    '<div class="crumbs reveal">'+crumbs.join('<span class="sep">/</span>')+'</div>'+body;
  setTabs([]);
  return html;
}

function renderCommits(name){
  const r = S.getRepo(name);
  if(!r) return notFound("no repo called "+name);
  const html = repoHeader(r, "commits") +
    '<div class="statgrid reveal">'+
      '<div class="statbox"><div class="n">'+r.commit_count+'</div><div class="l">commits shown</div></div>'+
      '<div class="statbox"><div class="n">'+S.fmtNum(r.loc)+'</div><div class="l">lines of code</div></div>'+
      '<div class="statbox"><div class="n">'+r.files+'</div><div class="l">files</div></div>'+
      '<div class="statbox"><div class="n">'+esc(r.branch)+'</div><div class="l">branch</div></div>'+
    '</div>'+
    '<div class="panel reveal"><div class="panel-h"><span>commit history</span></div>'+
    '<div>'+r.commits.map(c=>commitRow(r,c,false)).join("")+'</div></div>';
  setTabs([]);
  return html;
}

function renderCommit(name, sha){
  const r = S.getRepo(name);
  if(!r) return notFound("no repo called "+name);
  const c = r.commits.find(x=>x.sha === sha || x.short === sha);
  if(!c) return notFound("commit not found");
  const add = c.files.reduce((a,f)=>a+f.add,0), del = c.files.reduce((a,f)=>a+f.del,0);
  const html = repoHeader(r, "commits") +
    '<div class="crumbs reveal"><a href="#/">forge</a><span class="sep">/</span><a href="#/r/'+r.name+'">'+esc(r.name)+'</a><span class="sep">/</span><a href="#/r/'+r.name+'/commits">commits</a><span class="sep">/</span><b style="color:var(--txt)" class="mono">'+c.short+'</b></div>'+
    '<div class="panel reveal"><div class="panel-h"><span>commit</span><span class="mono" style="text-transform:none">'+c.sha+'</span></div>'+
    '<div style="padding:24px">'+
      '<div style="font-size:1.15rem;font-weight:700;letter-spacing:-.01em">'+esc(c.msg)+'</div>'+
      '<div style="display:flex;gap:14px;align-items:center;margin-top:14px">'+
        '<div class="cavatar" style="background:'+S.avatarColor(c.author)+'">'+esc(S.initials(c.author))+'</div>'+
        '<div><div style="font-weight:600;font-size:.9rem">'+esc(c.author)+'</div>'+
        '<div style="color:var(--mut);font-size:.8rem">'+S.fmtDate(c.date)+' · '+S.timeAgo(c.date)+'</div></div>'+
        '<div class="cstats" style="margin-left:auto"><span class="cadd">+'+add+'</span> <span class="cdel">-'+del+'</span> across '+c.files.length+' files</div>'+
      '</div>'+
      '<div class="commitfiles" style="margin-top:18px">'+c.files.map(f=>
        '<div class="cfilerow"><span class="p">'+esc(f.path)+'</span>'+
        '<span class="cadd">+'+f.add+'</span><span class="cdel">-'+f.del+'</span></div>').join("")+
      '</div>'+
    '</div></div>';
  setTabs([]);
  return html;
}

function renderSearch(q){
  const results = S.search(q, 30);
  const html = '<p class="micro reveal">search</p>'+
    '<h1 class="page reveal">results for "'+esc(q)+'"</h1>'+
    '<p class="sub reveal">'+results.length+' matches</p>'+
    '<div class="panel reveal">'+results.map(it=>{
      const href = it.type === "repo" ? "#/r/"+it.repo : "#/r/"+it.repo+"/blob/main/"+it.path;
      const mark = (s)=>{
        const i = s.toLowerCase().indexOf(q.toLowerCase());
        if(i === -1) return esc(s);
        return esc(s.slice(0,i))+"<mark>"+esc(s.slice(i,i+q.length))+"</mark>"+esc(s.slice(i+q.length));
      };
      return '<a class="sresult" href="'+href+'"><div class="sp">'+(it.type==="repo"?"📦 ":"📄 ")+mark(it.label)+'</div>'+
        '<div class="ss">'+esc(it.hint)+'</div></a>';
    }).join("")+'</div>';
  setTabs([]);
  return html;
}

function notFound(msg){
  setTabs([]);
  return '<div class="empty"><div class="big">🕳️</div><p>'+esc(msg)+'</p><p style="margin-top:12px"><a class="btn sm" href="#/">back home</a></p></div>';
}

function setTabs(){}

function bindReveal(){
  const els = document.querySelectorAll(".reveal:not(.on)");
  if(!("IntersectionObserver" in window)){ els.forEach(el=>el.classList.add("on")); return; }
  const io = new IntersectionObserver(es=>es.forEach(en=>{
    if(en.isIntersecting){ en.target.classList.add("on"); io.unobserve(en.target); }
  }),{threshold:.06});
  els.forEach(el=>io.observe(el));
}

function bindGlobal(){
  document.querySelectorAll("[data-clone]").forEach(b=>{
    b.onclick = ()=>{
      const url = "https://github.com/9osiris/"+b.dataset.clone.split("/").pop()+".git";
      navigator.clipboard.writeText(url).then(()=>toast("clone url copied"));
    };
  });
  document.querySelectorAll("[data-copy-target]").forEach(b=>{
    b.onclick = ()=>{
      const el = document.getElementById(b.dataset.copyTarget);
      if(el){ navigator.clipboard.writeText(el.innerText).then(()=>toast("copied")); }
    };
  });
}

function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove("show"), 1800);
}

window.ForgeViews = {
  renderHome, renderRepo, renderTree, renderBlob, renderCommits, renderCommit, renderSearch,
  bindHome, bindReveal, bindGlobal, toast, HomeState, notFound
};
})();
