@echo off
cd /d "%~dp0"
python run_se2026_dashboard.py >> dashboard_log.txt 2>&1