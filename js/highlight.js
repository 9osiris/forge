/* lightweight syntax highlighter - tokenizer based, no deps */
(function(){
"use strict";

const KEYWORDS = {
  python: "def|return|if|elif|else|for|while|in|not|and|or|import|from|as|with|try|except|finally|raise|class|pass|break|continue|lambda|yield|global|assert|del|is|None|True|False|self|async|await",
  javascript: "const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|typeof|instanceof|in|of|try|catch|finally|throw|class|extends|import|export|from|default|async|await|null|undefined|true|false|this|super",
  typescript: "const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|typeof|instanceof|in|of|try|catch|finally|throw|class|extends|implements|import|export|from|default|async|await|null|undefined|true|false|this|super|interface|type|enum|namespace|public|private|protected|readonly|static",
  lua: "local|function|end|if|then|else|elseif|for|while|do|return|break|in|and|or|not|nil|true|false|repeat|until",
  c: "int|char|float|double|void|long|short|unsigned|signed|struct|typedef|enum|union|static|const|extern|return|if|else|for|while|do|switch|case|break|continue|sizeof|goto|volatile|register",
  cpp: "int|char|float|double|void|long|short|unsigned|signed|struct|typedef|enum|union|static|const|extern|return|if|else|for|while|do|switch|case|break|continue|sizeof|goto|volatile|class|public|private|protected|virtual|template|typename|namespace|using|new|delete|true|false|nullptr|this|auto|bool|string",
  rust: "fn|let|mut|return|if|else|for|while|loop|match|struct|enum|impl|trait|use|mod|pub|crate|self|Self|true|false|const|static|ref|move|in|as|where|break|continue",
  go: "func|return|if|else|for|range|switch|case|break|continue|var|const|type|struct|interface|map|package|import|go|defer|nil|true|false",
  bash: "if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|in|select|until|export|local|readonly",
  sql: "select|from|where|join|left|right|inner|outer|on|group|by|order|having|insert|into|values|update|set|delete|create|table|alter|drop|and|or|not|null|as|distinct|limit"
};

const EXT_LANG = {
  py:"python", js:"javascript", jsx:"javascript", ts:"typescript", tsx:"typescript",
  mjs:"javascript", cjs:"javascript", lua:"lua", luau:"lua",
  c:"c", h:"c", cpp:"cpp", hpp:"cpp", cc:"cpp",
  rs:"rust", go:"go", sh:"bash", bash:"bash", ps1:"bash",
  json:"json", css:"css", html:"html", htm:"html", xml:"html",
  sql:"sql", md:"markdown", yml:"yaml", yaml:"yaml", toml:"toml"
};

function esc(s){
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function span(cls, s){ return '<span class="tok-'+cls+'">'+esc(s)+'</span>'; }

function highlightCode(code, lang){
  if(lang === "json"){
    return esc(code).replace(/(&quot;.*?&quot;)(\s*:)?/g, (m,str,colon)=>
      colon ? '<span class="tok-s">'+str+'</span>'+colon : '<span class="tok-s">'+str+'</span>')
      .replace(/\b(true|false|null)\b/g, '<span class="tok-k">$1</span>')
      .replace(/(^|[\s\[,:])(-?\d+\.?\d*)/g, '$1<span class="tok-n">$2</span>');
  }
  if(lang === "css"){
    return esc(code)
      .replace(/(\/\*[\s\S]*?\*\/)/g, '\u0000$1\u0000')
      .replace(/^([.#]?[a-zA-Z][\w-]*)(?=\s*\{)/gm, '<span class="tok-f">$1</span>')
      .replace(/([a-zA-Z-]+)(\s*:)/g, '<span class="tok-a">$1</span>$2')
      .replace(/(#[0-9a-fA-F]{3,8}\b|\b\d+(\.\d+)?(px|em|rem|%|s|ms|vh|vw)?\b)/g, '<span class="tok-n">$1</span>')
      .replace(/\u0000(.*?)\u0000/g, '<span class="tok-c">$1</span>');
  }
  if(lang === "html"){
    return esc(code)
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-c">$1</span>')
      .replace(/(&lt;\/?)([a-zA-Z][\w-]*)/g, '$1<span class="tok-k">$2</span>')
      .replace(/([\w-]+)=(&quot;.*?&quot;)/g, '<span class="tok-a">$1</span>=<span class="tok-s">$2</span>');
  }
  if(lang === "markdown"){
    return esc(code)
      .replace(/^(#{1,6}\s.*)$/gm, '<span class="tok-k">$1</span>')
      .replace(/(`[^`]+`)/g, '<span class="tok-s">$1</span>')
      .replace(/^(\s*[-*+]\s.*|\s*\d+\.\s.*)$/gm, '<span class="tok-f">$1</span>');
  }

  const kw = KEYWORDS[lang];
  const commentRe = (lang === "python" || lang === "lua" || lang === "bash") ? "#" : "//";
  const out = [];
  let i = 0, n = code.length;

  while(i < n){
    const ch = code[i];
    if(ch === '"' || ch === "'" || ch === "`"){
      let j = i+1, q = ch;
      if(code.substr(i,3) === '"""' || code.substr(i,3) === "'''"){
        q = code.substr(i,3); j = i+3;
        while(j < n && code.substr(j,3) !== q) j++;
        j += 3;
      } else {
        while(j < n && code[j] !== q){ if(code[j] === "\\") j++; j++; }
        j++;
      }
      out.push(span("s", code.slice(i,j))); i = j; continue;
    }
    if(commentRe === "#" && ch === "#"){
      let j = i; while(j < n && code[j] !== "\n") j++;
      out.push(span("c", code.slice(i,j))); i = j; continue;
    }
    if(commentRe === "//" && ch === "/" && code[i+1] === "/"){
      let j = i; while(j < n && code[j] !== "\n") j++;
      out.push(span("c", code.slice(i,j))); i = j; continue;
    }
    if(ch === "/" && code[i+1] === "*"){
      let j = code.indexOf("*/", i+2); j = j === -1 ? n : j+2;
      out.push(span("c", code.slice(i,j))); i = j; continue;
    }
    const num = code.slice(i).match(/^(0x[0-9a-fA-F]+|\d+\.?\d*)/);
    if(num && !/[a-zA-Z_]/.test(code[i-1]||"")){
      out.push(span("n", num[0])); i += num[0].length; continue;
    }
    const id = code.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if(id){
      const w = id[0];
      let j = i + w.length;
      let k = j; while(code[k] === " ") k++;
      if(kw && new RegExp("^(?:"+kw+")$").test(w)) out.push(span("k", w));
      else if(code[k] === "(") out.push(span("f", w));
      else if(/^[A-Z]/.test(w)) out.push(span("t", w));
      else out.push(esc(w));
      i = j; continue;
    }
    out.push(esc(ch)); i++;
  }
  return out.join("");
}

function langFor(path){
  const ext = (path.split(".").pop() || "").toLowerCase();
  return EXT_LANG[ext] || "text";
}

window.ForgeHL = { highlight: highlightCode, langFor: langFor };
})();
