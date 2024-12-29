import json
import os
import subprocess


def check_json_file() -> bool:
    with open('jobs.json', 'r') as file:
        data = json.load(file)
        for i in data.get("jobs", []):
            if not i.get('skip', False):
                return False
        return True

if __name__ == '__main__':
    while True:
        try:
            os.remove("node.lock")
        except FileNotFoundError:
            pass
        subprocess.run("npx tsx jobs.ts", shell=True)
        if check_json_file(): break