@echo off
title He thong Quan Ly Vat Tu
echo Dang khoi dong va kiem tra cap nhat...
cd Source_App
:: Dung --build de dam bao code moi luon duoc cap nhat
docker-compose up -d --build
echo --------------------------------------------------
echo He thong da san sang!
echo Vui long truy cap: http://localhost:3000
echo --------------------------------------------------
timeout /t 3
start http://localhost:3000
pause