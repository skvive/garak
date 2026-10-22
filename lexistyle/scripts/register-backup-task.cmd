@echo off
schtasks /create /tn "LEXI-PG-DailyBackup" /tr "\"E:\currsor_C\lexistyle\scripts\backup-local-pg.cmd\"" /sc daily /st 03:00 /f