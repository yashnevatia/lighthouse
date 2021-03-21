#!/bin/bash

startFronEnd(){
echo "Running react app"
cd ../frontend
npm i
npm start
}

startBackEnd(){
echo "Running flask app"
cd backend
python3 -m venv test_env
source test_env/bin/activate
pip3 install -r requirements.txt
echo "Starting server in background"
python3 server.py &
}

startBackEnd()
startFronEnd()

exit 0
