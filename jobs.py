import json
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
        subprocess.run("npx tsx jobs.ts", shell=True)
        if check_json_file(): break