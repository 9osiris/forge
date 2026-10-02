#!/usr/bin/env python3
# builds data/data.json for the forge from local repo checkouts + github api
# run from the repo root: python3 tools/build.py
import json, os, subprocess, urllib.request, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPOS_DIR = os.path.expanduser("~/workspace/github")
OUT = os.path.join(ROOT, "data", "data.json")
AVATAR = os.path.join(ROOT, "assets", "avatar.png")

ORDER = ["mule", "cognix", "council", "relay", "probe", "promptlab",
         "mockllm", "memkit", "ctxpack", "envx", "watchrun", "embedx",
         "servex", "chip8", "cassette"]

SKIP_DIRS = {".git", "__pycache__", ".venv", "venv", "node_modules",
             ".mypy_cache", ".pytest_cache", "dist", "build", "*.egg-info"}
SKIP_EXT = {".pyc", ".pyo", ".o", ".so", ".dll", ".exe", ".bin",
            ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf",
            ".zip", ".tar", ".gz", ".mp3", ".wav", ".mp4", ".ttf", ".woff", ".woff2"}
MAX_FILE = 80 * 1024
MAX_COMMITS = 60

LANGS = {".py": "Python", ".js": "JavaScript", ".ts": "TypeScript",
         ".html": "HTML", ".css": "CSS", ".lua": "Lua", ".luau": "Luau",
         ".cpp": "C++", ".c": "C", ".h": "C++", ".hpp": "C++",
         ".rs": "Rust", ".go": "Go", ".sh": "Shell", ".ps1": "PowerShell",
         ".json": "JSON", ".md": "Markdown", ".yaml": "YAML", ".yml": "YAML",
         ".toml": "TOML", ".sql": "SQL"}

def run(cmd, cwd):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=60)
    return p.stdout

def is_text(path):
    try:
        with open(path, "rb") as f:
            chunk = f.read(8192)
        if b"\x00" in chunk:
            return False
        chunk.decode("utf-8")
        return True
    except Exception:
        return False

def walk(repo):
    out = []
    for dirpath, dirnames, filenames in os.walk(repo):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.endswith(".egg-info")]
        for fn in filenames:
            ext = os.path.splitext(fn)[1].lower()
            if ext in SKIP_EXT:
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, repo)
            try:
                sz = os.path.getsize(full)
            except OSError:
                continue
            if not is_text(full):
                continue
            out.append((rel, sz))
    return sorted(out)

def commits(repo):
    log = run(["git", "log", f"-n{MAX_COMMITS}",
               "--format=%H%x01%h%x01%an%x01%aI%x01%s"], repo)
    out = []
    for line in log.splitlines():
        parts = line.split("\x01")
        if len(parts) != 5:
            continue
        sha, short, author, date, msg = parts
        files = []
        try:
            stat = run(["git", "show", "--numstat", "--format=", sha], repo)
            for sline in stat.splitlines():
                sp = sline.split("\t")
                if len(sp) == 3:
                    add = int(sp[0]) if sp[0] != "-" else 0
                    dele = int(sp[1]) if sp[1] != "-" else 0
                    files.append({"path": sp[2], "add": add, "del": dele})
        except Exception:
            pass
        out.append({"sha": sha, "short": short, "author": author,
                    "date": date, "msg": msg, "files": files})
    return out

def api_meta():
    req = urllib.request.Request(
        "https://api.github.com/users/9osiris/repos?per_page=100",
        headers={"User-Agent": "forge-build", "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    meta = {}
    for repo in data:
        meta[repo["name"]] = {
            "description": repo.get("description") or "",
            "stars": repo.get("stargazers_count", 0),
            "forks": repo.get("forks_count", 0),
            "language": repo.get("language"),
            "updated": repo.get("pushed_at") or repo.get("updated_at"),
            "branch": repo.get("default_branch", "main"),
            "url": repo.get("html_url"),
        }
    me_req = urllib.request.Request("https://api.github.com/users/9osiris",
        headers={"User-Agent": "forge-build", "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(me_req, timeout=30) as r:
        me = json.load(r)
    return meta, {"bio": me.get("bio") or "", "name": me.get("name") or "9osiris",
                  "public_repos": me.get("public_repos", 0)}

def main():
    meta, profile = api_meta()
    repos = []
    activity = {}
    total_commits = 0
    total_loc = 0
    for name in ORDER:
        repo = os.path.join(REPOS_DIR, name)
        if not os.path.isdir(repo):
            print("skip missing", name)
            continue
        m = meta.get(name, {})
        files = walk(repo)
        lang_bytes = {}
        loc = 0
        contents = {}
        tree = []
        for rel, sz in files:
            ext = os.path.splitext(rel)[1].lower()
            lang = LANGS.get(ext, "Other")
            lang_bytes[lang] = lang_bytes.get(lang, 0) + sz
            tree.append({"path": rel, "size": sz})
            if sz <= MAX_FILE:
                try:
                    with open(os.path.join(repo, rel), encoding="utf-8") as f:
                        text = f.read()
                    contents[rel] = text
                    loc += text.count("\n") + 1
                except Exception:
                    pass
        total = sum(lang_bytes.values()) or 1
        languages = {k: round(v / total * 100, 1) for k, v in
                     sorted(lang_bytes.items(), key=lambda kv: -kv[1])}
        clist = commits(repo)
        total_commits += len(clist)
        total_loc += loc
        for c in clist:
            try:
                day = datetime.datetime.fromisoformat(c["date"]).date().isoformat()
                activity[day] = activity.get(day, 0) + 1
            except Exception:
                pass
        readme = contents.get("README.md", "")
        repos.append({
            "name": name,
            "description": m.get("description", ""),
            "language": m.get("language"),
            "stars": m.get("stars", 0),
            "forks": m.get("forks", 0),
            "updated": m.get("updated"),
            "branch": m.get("branch", "main"),
            "github": m.get("url", f"https://github.com/9osiris/{name}"),
            "loc": loc,
            "files": len(files),
            "commit_count": len(clist),
            "languages": languages,
            "readme": readme,
            "tree": tree,
            "contents": contents,
            "commits": clist,
        })
        print(f"{name}: {len(files)} files, {loc} loc, {len(clist)} commits")
    data = {"meta": {"generated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                     "user": "9osiris", "repo_count": len(repos)},
            "profile": {"bio": profile["bio"], "name": profile["name"],
                        "total_commits": total_commits, "total_loc": total_loc,
                        "activity": activity},
            "repos": repos}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))
    print("wrote", OUT, f"{os.path.getsize(OUT)/1024:.0f}KB")
    os.makedirs(os.path.dirname(AVATAR), exist_ok=True)
    try:
        urllib.request.urlretrieve("https://github.com/9osiris.png", AVATAR)
        print("avatar saved")
    except Exception as e:
        print("avatar failed:", e)

if __name__ == "__main__":
    main()
