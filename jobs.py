import subprocess
from time import sleep

while True:
    subprocess.run("npx tsx jobs.ts", shell=True)
    sleep(10)