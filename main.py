# The backend of what powers the magic of video downloading
# Quite reliable

import argparse
import base64
import os
import random
import subprocess
from pathlib import Path

import requests
from filelock import FileLock

output: str = "output"


def download_video_and_pssh(url: str, temp_name: str) -> str:
    process = subprocess.run(f"./N_m3u8DL-RE.exe --auto-select --save-name {temp_name} {url}", capture_output=True)
    output = process.stdout.decode("utf-8").split('\n')
    for line in output:
        if line.startswith("CAESE"):
            return line


def read_pssh(path: str) -> str:
    raw = Path(path).read_bytes()
    pssh_offset = raw.rfind(b'pssh')
    _start = pssh_offset - 4
    _end = pssh_offset - 4 + raw[pssh_offset - 1]
    pssh = raw[_start:_end]
    return str(base64.b64encode(pssh))


def get_decryption_keys(pssh: str, license_url: str) -> str:
    CDRM_API = 'https://cdrm-project.com/'

    json_data = {
        'PSSH': pssh,
        'License URL': license_url,
        'Headers': "{}",
        'JSON': "{}",
        "Cookies": "{}",
        'Data': "{}",
        'Proxy': ""
    }

    print(pssh)
    print(license_url)

    decryption_results = requests.post(CDRM_API, json=json_data)

    return decryption_results.json()['Message']


def decrypt_files(keys: str, temp_name: str):
    subprocess.run(f"./mp4decrypt.exe --key {keys} {temp_name}.mp4 {temp_name}_merge.mp4")
    subprocess.run(f"./mp4decrypt.exe --key {keys} {temp_name}.en.m4a {temp_name}_merge.m4a")


def merge_files(file_name: str, temp_name: str):
    subprocess.run(
        f"ffmpeg -i {temp_name}_merge.mp4 -i {temp_name}_merge.m4a -acodec copy -vcodec copy {temp_name}_final.mp4")
    try:
        os.rename(f"{temp_name}_final.mp4", f"{output}/{sanitize_file_string(file_name)}.mp4")
    except FileNotFoundError:
        os.mkdir(output)
        os.rename(f"{temp_name}_final.mp4", f"{output}/{sanitize_file_string(file_name)}.mp4")


def cleanup(temp_name: str):
    try:
        os.remove(f"{temp_name}.mp4")
        os.remove(f"{temp_name}.en.m4a")
        os.remove(f"{temp_name}_merge.mp4")
        os.remove(f"{temp_name}_merge.m4a")
        os.remove(f"{temp_name}_final.mp4")
    except OSError:
        pass


def sanitize_file_string(input_filename: str) -> str:
    # Substitute the illegal characters inside Windows file system with the dash
    illegal_characters: str = r'<>:"/\|?*'
    substitute_character: str = "-"
    return_character: str = ""
    for character in input_filename:
        if character in illegal_characters:
            return_character += substitute_character
        else:
            return_character += character
    return return_character

def main(video_url: str, license_url: str, file_name: str, temp_name: str):
    pssh_key = download_video_and_pssh(video_url, temp_name)
    print("Successfully downloaded video and PSSH key")
    keys = get_decryption_keys(pssh_key, license_url)
    print("Got decryption keys")
    decrypt_files(keys, temp_name)
    print("Decrypted files")
    merge_files(file_name, temp_name)
    print("Merged files")
    cleanup(temp_name)
    print("Cleaned up")


if __name__ == "__main__":
    rng_temp_name = random.randint(1, 100)
    parser = argparse.ArgumentParser(description="Optional arguments")
    parser.add_argument("--video_url", type=str, help="Video URL")
    parser.add_argument("--license_url", type=str, help="License URL")
    parser.add_argument("--file_name", type=str, help="File name")
    parser.add_argument("--output", type=str, help="Output folder")
    args = parser.parse_args()
    if args.video_url:
        video_url = args.video_url
        license_url = args.license_url
        file_name = args.file_name
        output = args.output
    else:
        video_url = input("Enter video URL: ")
        license_url = input("Enter license URL: ")
        file_name = input("Enter file name: ")

    # Create a lock file in the same directory as the script
    lock_path = Path(__file__).with_suffix('.lock')
    lock = FileLock(lock_path)

    # This ensures that only one download goes at a time
    with lock:
        main(video_url, license_url, file_name, str(rng_temp_name))
