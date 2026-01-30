#!/usr/bin/env python3
import os, re, subprocess, sys

BASE_COMMIT = os.environ.get("BASE_COMMIT", "")
if not BASE_COMMIT or BASE_COMMIT == "SUBSTITUA_AQUI_PELO_HASH_DO_DIA_0":
    print("::error::Configure BASE_COMMIT no workflow com o hash do dia 0")
    sys.exit(1)

# Regex para Conventional Commits
PATTERN = re.compile(r'^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^\)]+\))?(!)?\: .+')

def get_commits():
    cmd = ["git", "log", f"{BASE_COMMIT}..HEAD", "--pretty=format:%s"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"::error::Git falhou: {result.stderr}")
        sys.exit(1)
    return [c for c in result.stdout.strip().split("\n") if c]

def main():
    commits = get_commits()
    if not commits:
        print("next_version=0.0.0")
        print("has_breaking=false"); print("has_feat=false"); print("has_fix=false")
        return

    has_breaking = has_feat = has_fix = False
    invalid = []

    for msg in commits:
        if not PATTERN.match(msg):
            invalid.append(msg)
            continue
        if "!" in msg.split(":")[0] or "BREAKING CHANGE" in msg:
            has_breaking = True
        elif msg.startswith("feat"):
            has_feat = True
        elif msg.startswith("fix"):
            has_fix = True

    if invalid:
        print("::group::Commits inválidos encontrados")
        for m in invalid:
            print(f"::error::{m}")
        print("::endgroup::")
        sys.exit(1)

    # Calcular bump desde o dia 0 (0.0.0)
    major = minor = patch = 0
    
    if has_breaking:
        major = sum(1 for c in commits if "!" in c or "BREAKING CHANGE" in c)
    elif has_feat:
        minor = sum(1 for c in commits if c.startswith("feat"))
    elif has_fix:
        patch = sum(1 for c in commits if c.startswith("fix"))

    version = f"{major}.{minor}.{patch}"
    
    # Output para GitHub Actions
    with open(os.environ.get("GITHUB_OUTPUT", "/dev/null"), "a") as f:
        f.write(f"next_version={version}\n")
        f.write(f"has_breaking={str(has_breaking).lower()}\n")
        f.write(f"has_feat={str(has_feat).lower()}\n")
        f.write(f"has_fix={str(has_fix).lower()}\n")
    
    print(f"Versão calculada: {version}")

if __name__ == "__main__":
    main()
