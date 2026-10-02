/* tiny markdown renderer - headings, code, lists, tables, links, inline */
(function(){
"use strict";

function esc(s){
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function inline(s){
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (m,c)=>{ codes.push(c); return "\u0000"+(codes.length-1)+"\u0000"; });
  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, '<img alt="$1" src="$2" loading="lazy">');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (m,t,u)=>{
    const ext = /^(https?:)?\/\//.test(u) ? ' target="_blank" rel="noopener"' : '';
    return '<a href="'+u+'"'+ext+'>'+t+'</a>';
  });
  s = s.replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  s = s.replace(/\u0000(\d+)\u0000/g, (m,i)=>"<code>"+esc(codes[+i])+"</code>");
  return s;
}

function render(md){
  if(!md) return '<div class="empty"><div class="big">📄</div><p>no readme in this repo yet.</p></div>';
  const lines = md.replace(/\r\n?/g,"\n").split("\n");
  let html = "", i = 0, inCode = false, codeLang = "", codeBuf = [];
  let listStack = [];

  function closeLists(){
    while(listStack.length){ html += listStack.pop() === "ul" ? "</ul>" : "</ol>"; }
  }

  while(i < lines.length){
    const line = lines[i];
    const fence = line.match(/^```(\w*)\s*$/);
    if(fence){
      if(!inCode){ inCode = true; codeLang = fence[1]; codeBuf = []; }
      else{
        inCode = false;
        html += '<pre><code class="lang-'+esc(codeLang)+'">'+esc(codeBuf.join("\n"))+"</code></pre>";
      }
      i++; continue;
    }
    if(inCode){ codeBuf.push(line); i++; continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if(h){
      closeLists();
      const lvl = h[1].length;
      const id = h[2].toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
      html += '<h'+lvl+' id="'+id+'">'+inline(h[2])+'</h'+lvl+'>';
      i++; continue;
    }
    if(/^(\*\*\*|---|___)\s*$/.test(line)){ closeLists(); html += "<hr>"; i++; continue; }
    if(/^>\s?/.test(line)){
      closeLists();
      const bq = [];
      while(i < lines.length && /^>\s?/.test(lines[i])){ bq.push(lines[i].replace(/^>\s?/,"")); i++; }
      html += "<blockquote>"+renderInlineBlock(bq.join("\n"))+"</blockquote>";
      continue;
    }
    if(/\|/.test(line) && i+1 < lines.length && /^\|?[\s:|-]+\|?[\s:|-]*$/.test(lines[i+1]) && /\|/.test(lines[i+1])){
      closeLists();
      const headers = line.split("|").map(s=>s.trim()).filter(s=>s!=="");
      i += 2;
      html += "<table><thead><tr>"+headers.map(h=>"<th>"+inline(h)+"</th>").join("")+"</tr></thead><tbody>";
      while(i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== ""){
        const cells = lines[i].split("|").map(s=>s.trim()).filter(s=>s!=="");
        html += "<tr>"+cells.map(c=>"<td>"+inline(c)+"</td>").join("")+"</tr>";
        i++;
      }
      html += "</tbody></table>";
      continue;
    }
    const ul = line.match(/^(\s*)[-*+]\s+(.*)$/);
    const ol = line.match(/^(\s*)\d+\.\s+(.*)$/);
    const task = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if(ul || ol || task){
      const m = task || ul || ol;
      const indent = m[1].length;
      const type = ol && !task ? "ol" : "ul";
      const depth = Math.floor(indent/2);
      while(listStack.length > depth+1){ html += listStack.pop() === "ul" ? "</ul>" : "</ol>"; }
      while(listStack.length < depth+1){ html += "<"+type+">"; listStack.push(type); }
      let content = task ? m[3] : m[2];
      if(task){
        const checked = /[xX]/.test(m[2]);
        content = '<input type="checkbox" disabled'+(checked?' checked':'')+'> '+content;
      }
      html += "<li>"+inline(content)+"</li>";
      i++; continue;
    }
    if(/^\s*$/.test(line)){ closeLists(); i++; continue; }
    closeLists();
    const para = [];
    while(i < lines.length && !/^\s*$/.test(lines[i])
      && !/^(#{1,6}\s|```|>|\s*([-*+]\s|\d+\.\s)|(\*\*\*|---|___)\s*$)/.test(lines[i])
      && !(/\|/.test(lines[i]) && i+1 < lines.length && /^\|?[\s:|-]+\|?$/.test(lines[i+1]))){
      para.push(lines[i]); i++;
    }
    if(para.length) html += "<p>"+inline(para.join(" "))+"</p>";
    else i++;
  }
  closeLists();
  return html;
}

function renderInlineBlock(s){
  return s.split(/\n\n+/).map(p=>"<p>"+inline(p.replace(/\n/g," "))+"</p>").join("");
}

window.ForgeMD = { render: render, esc: esc };
})();
