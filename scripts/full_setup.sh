#!/usr/bin/env bash

sudo apt install nodejs -y
sudo apt install npm -y
sudo apt install python3 -y
sudo apt install pip -y
if pwd | grep -q "scripts"
then
  cd ..
fi
printf "[replace with email]\n[replace with password]" > password
touch jobs.json
npm install
python3 testing.py
vitest run