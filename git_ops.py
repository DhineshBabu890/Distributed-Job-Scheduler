import os
import subprocess
import sys
from pathlib import Path

repo = Path(r"c:\Users\tempd\Downloads\codity project")
log_file = repo / "git_ops.log"

with log_file.open("w", encoding="utf-8") as f:
    def run(cmd):
        print("RUN:", cmd, file=f)
        try:
            res = subprocess.run(cmd, cwd=repo, capture_output=True, text=True)
            print("RC:", res.returncode, file=f)
            if res.stdout:
                f.write("STDOUT:\n" + res.stdout)
            if res.stderr:
                f.write("STDERR:\n" + res.stderr)
        except Exception as e:
            print("EXC:", repr(e), file=f)

    run(["git", "config", "user.name", "DhineshBabu890"])
    run(["git", "config", "user.email", "dhineshbabu890@gmail.com"])
    run(["git", "status", "--short"])
    run(["git", "add", "."])
    run(["git", "commit", "-m", "Initial commit"])
    run(["git", "push", "-u", "origin", "HEAD:main"])
