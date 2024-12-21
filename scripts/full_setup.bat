@echo off

if not exist "password" (
    echo "[replace with email]" >> password
    echo "[replace with password]" >> password
)
if not exist "jobs.json" echo "" >> jobs.json
pip install virtualenv
virtualenv venv
venv/Scripts/activate
pip install -r requirements.txt
npm install
npm test