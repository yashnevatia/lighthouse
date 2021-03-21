from flask import Flask, render_template
from flask_socketio import SocketIO, send, emit
from flask_cors import CORS

import json
import numpy as np
from threading import Thread, Event
import datetime
# thread_stop_event = Event()
thread = None


app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
CORS(app, origins="*", methods=['GET', 'POST'], allow_headers=[
        "Content-Type", "Authorization", "Access-Control-Allow-Credentials", "Access-Control-Allow-Origin",
        "Access-Control-Allow-Headers"], supports_credentials=True)

socketio = SocketIO(app,cors_allowed_origins="*")

generateData = False
client_count = 0
allData = []
replayMode = 0
replayStartIndex = 0
numberReplayed = 0
numberToReplay = 0

with open('ric_config.txt') as f:
    json_data = json.load(f)
    elements_per_update = int(json_data['elements_per_update'])
    print("Elements per update ", elements_per_update)
    tickers = np.array(json_data['symbols'])
    print("Ticker list: ", tickers)
    update_frequency_milliseconds = int(json_data['update_frequency_milliseconds'])
    print("Update frequency: ", update_frequency_milliseconds)
    thresholdDict = {}
    for t in tickers:thresholdDict[t] = 10
    ric_list = []
    for i in range(len(tickers)):
        ric_list.append({"ric": tickers[i], "threshold":10})

def background_thread():
    """Example of how to send server generated events to clients."""
    global allData
    global replayStartIndex
    global numberReplayed
    global replayMode
    global numberToReplay
    while generateData:
        print("sending data", thresholdDict)
        data = []
        data2 = []
        random_tickers = np.random.choice(tickers, elements_per_update)
        random_price = np.random.randint(1, 20, elements_per_update).tolist()
        for i in range(elements_per_update):
            data.append({"ric": random_tickers[i],
                         "price": random_price[i],
                         "tickTime": str(datetime.datetime.now())[11:],
                         "threshold": thresholdDict[random_tickers[i]]
                         })
            data2.append({"ric": random_tickers[i],
                         "price": random_price[i],
                         "tickTime": datetime.datetime.now(),
                         "threshold": thresholdDict[random_tickers[i]]
                         })

        allData += data2
        if not replayMode: socketio.emit('ric_data', data)
        if replayMode:
            print("ON REPLAY MODE SEND",numberToReplay, numberReplayed, replayStartIndex)
            print("numberReplayed", numberReplayed)
            print("replayStartIndex", replayStartIndex)
            if numberToReplay > numberReplayed:
                print("replaying here")
                newdata = []
                for data in allData[replayStartIndex:replayStartIndex + elements_per_update]:
                    newdata.append({"ric": data["ric"],
                                 "price": data["price"],
                                 "tickTime": str(data["tickTime"])[11:],
                                 "threshold": thresholdDict[data["ric"]]
                                 })
                socketio.emit('ric_data',newdata)
                replayStartIndex = replayStartIndex + elements_per_update
                numberReplayed += elements_per_update
            else:
                socketio.emit('replay_ack',{'data':'All Replayed, starting live again','replayMode':0})
                print("All replayed")
                replayMode = not replayMode
                numberToReplay

        print("count of all Data", len(allData))
        print("Going to sleep for data generation")
        socketio.sleep(update_frequency_milliseconds*0.001)
        print("Done Sleeping")

@socketio.on('toggle_replay')
def test_replay(data):
    global replayMode
    global replayStartIndex
    global numberToReplay
    if data['start'] == data['end'] and data['start'] == 0:
        if replayMode:
            print("Ending replay", data)
            replayMode = not replayMode
            numberToReplay = 0
            emit('replay_ack', {data:'Ending replay on request'})
    elif data['start'] < data['end']:
        if not replayMode:
            print("Starting replay with data", data)
            timenow = datetime.datetime.now()
            print("now", timenow)
            startime_delta = datetime.timedelta(minutes= 5 - int(data['start']))
            print("start delta", startime_delta)
            endtime_delta = datetime.timedelta(minutes= 5 - int(data['end'])) + datetime.timedelta(seconds=20)
            print("end delta", endtime_delta)
            startReplayTime = timenow - startime_delta
            print("start replay time", startReplayTime)
            endReplayTime = timenow - endtime_delta
            print("end replay time", endReplayTime)
            for i, data in enumerate(allData):
                if data["tickTime"] > startReplayTime:
                    replayStartIndex = i
                    print("replayStartIndex", replayStartIndex)
                    break
            for i, data in enumerate(allData[replayStartIndex:]):
                if data["tickTime"] > endReplayTime:
                    print("found some timer here", data)
                    print("found some timer here", i)
                    numberToReplay = i
                    print("numberToReplay", numberToReplay)
                    break
            if numberToReplay > 0:
                replayMode = not replayMode
                emit('replay_ack',{'data':'Starting Replay', 'replayMode':1})
            else:
                emit('replay_ack',{'data':'Nothing to  Replay', 'replayMode':0})

    # replayMode = not replayMode
    # print("data", data)

@socketio.on('disconnect')
def test_disconnect():
    global generateData
    global client_count
    print('Client disconnected')
    client_count -= 1
    print('Client count now is', client_count)
    if not client_count:
        print("No subscribers, stop generating data")
        generateData = False
        print("Resetting update frequency")
        update_frequency_milliseconds = int(json_data['update_frequency_milliseconds'])

# this is fired when we open socket connection
@socketio.on('connect')
def test_connect():
    print("Client connected")

@socketio.on('client_ack')
def test_connect_ack(data):
    print("Client connected ACK", data)
    global thread
    global client_count
    global generateData
    client_count += 1
    print("Client number ", client_count)
    if thread == None:
        print("There was no thread, starting thread")
        generateData = True
        thread = Thread(target=background_thread)
        thread.daemon = True
        thread.start()
    print('sending ric list', ric_list)
    emit('ric_list', ric_list)
    print("sending frequency",  {'frequency': update_frequency_milliseconds})
    emit('frequency', {'frequency': update_frequency_milliseconds*0.001})

@socketio.on('thresholdUpdate')
def updateDict(data):
    global thresholdDict
    print("thresholdUpdate", data)
    thresholdDict = data
    print("thresholdUpdate", thresholdDict)

@socketio.on('frequencyUpdate')
def updateDict(data):
    global update_frequency_milliseconds
    print("frequencyUpdate", data, data['frequency'])
    if  data['frequency']:update_frequency_milliseconds = data['frequency']

    # if 50 < data['frequency'] : update_frequency_milliseconds = data['frequency']
    # thresholdDict = data
    # print("thresholdUpdate", thresholdDict)

if __name__ == '__main__':
    socketio.run(app)
