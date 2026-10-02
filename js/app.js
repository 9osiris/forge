/* forge boot + hash router */
(function(){
"use strict";
const S = window.ForgeStore, V = window.ForgeViews;
const app = document.getElementById("app");

function route(){
  const hash = location.hash || "#/";
  const parts = hash.replace(/^#\//,"").split("/");
  let html = "";

  if(parts[0] === "" || !parts[0]){
    html = V.renderHome();
    afterRender(()=>V.bindHome());
  } else if(parts[0] === "r" && parts[1]){
    const repo = parts[1], kind = parts[2] || "";
    if(kind === "tree"){
      const branch = parts[3] || "main";
      const path = parts.slice(4).join("/");
      html = V.renderTree(repo, branch, path);
    } else if(kind === "blob"){
      const branch = parts[3] || "main";
      const path = parts.slice(4).join("/");
      html = V.renderBlob(repo, branch, path);
    } else if(kind === "commits"){
      html = V.renderCommits(repo);
    } else if(kind === "commit" && parts[3]){
      html = V.renderCommit(repo, parts[3]);
    } else if(kind === ""){
      html = V.renderRepo(repo);
    } else {
      html = V.notFound("bad route");
    }
  } else if(parts[0] === "search"){
    const q = decodeURIComponent(parts.slice(1).join("/"));
    html = V.renderSearch(q);
  } else {
    html = V.notFound("bad route");
  }

  app.innerHTML = html;
  V.bindReveal();
  V.bindGlobal();
  window.scrollTo(0,0);
}

function afterRender(fn){
  const raf = window.requestAnimationFrame || (cb=>setTimeout(cb, 16));
  raf(()=>raf(fn));
}

function initSearch(){
  const inp = document.getElementById("globalSearch");
  inp.addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && inp.value.trim()){
      location.hash = "#/search/"+encodeURIComponent(inp.value.trim());
      inp.value = "";
      inp.blur();
    }
  });
  document.addEventListener("keydown", (e)=>{
    if(e.key === "/" && !/input|textarea/i.test(document.activeElement.tagName)){
      e.preventDefault();
      inp.focus();
    }
  });
}

async function boot(){
  try{
    await S.load();
  }catch(e){
    app.innerHTML = '<div class="empty"><div class="big">💥</div><p>could not load repo data.</p><p style="margin-top:8px;color:var(--mut);font-size:.85rem">run <span class="mono">python3 tools/build.py</span> first.</p></div>';
    return;
  }
  window.ForgePalette.init();
  initSearch();
  window.addEventListener("hashchange", route);
  route();
}

document.addEventListener("DOMContentLoaded", boot);
})();
