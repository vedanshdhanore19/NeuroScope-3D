@echo off
cd /d "%~dp0backend"
if not exist venv (
  echo Creating virtual environment and installing dependencies - first run only...
  python -m venv venv
  call venv\Scripts\activate.bat
  python -m pip install --upgrade pip
  pip install -r requirements.txt
) else (
  call venv\Scripts\activate.bat
)
python -m uvicorn main:app --host 127.0.0.1 --port 8001
pause
