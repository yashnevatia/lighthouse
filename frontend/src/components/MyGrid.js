import React, { useEffect, useState, useRef } from 'react';
// import React, { Component } from 'react';
import { AgGridColumn, AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
import InputField from './InputField';
import FrequencyField from './FrequencyField';
import TimeInputField from './TimeInputField';


import io from 'socket.io-client';

const socket = io('http://localhost:5000')

socket.on('connect', function(ric_list) {
    socket.emit('client_ack', {data: 'I\'m connected!'});
});

const MyGrid = ({gridType}) => {

    const [gridApi, setGridApi] = useState(null);
    const [rowData, setRowData] = useState([]);
    const [allData, setAllData] = useState([]);
    const [addData, setAddData] = useState([]); // this gets added on update
    const [removeData, setRemoveData] = useState([]);
    const [threshold, setThreshold] = React.useState(10);
    const [frequency, setFrequency] = React.useState(1000);
    const [ricList, setricList] = useState(new Object());
    const [replayDict, setReplayDict] = useState({
        'replayMode':0, 'starttime':0, 'endtime': 0
    });

    const onGridReady = (params: GridReadyEvent) => {
        setGridApi(params.api);
        params.api.setRowData([]);
        console.log("gridType", gridType);
        socket.on('ric_list', function(ric_list) {
            console.log("got ricList, ", ric_list);
            var dict = new Object();
            for(var i=0;i < ric_list.length; i++){
                dict[ric_list[i]["ric"]] = parseInt(ric_list[i]["threshold"])
            }
            console.log(dict);
            setricList(dict);
            console.log("Setting ricList in App", ricList)
        });

        socket.on('frequency', function(frequency){
            console.log("got frequency", frequency);
            setFrequency(frequency.frequency)
        })

        socket.on('replay_ack', function(data){
            console.log("replay_ack", data);
            let temp = replayDict
            temp.replayMode = data.replayMode
            setReplayDict(temp)
            alert(data.data)
            // based on this toggle replay mode
         })
        socket.on(gridType, (new_data) => {
            console.log("new data event", new_data);
            setAllData((oldMessages) => {
                if(oldMessages.length < 50){
                    setRemoveData([])
                    return [...oldMessages.concat(new_data)];
                }
                else {
                    let toRemove = oldMessages.splice(0, new_data.length)
                    console.log("REMOVING data", toRemove.length);
                    setRemoveData(toRemove)
                    return oldMessages;
                };
            });
            setAddData(new_data)
        })

    };

    useEffect(() => {
        if(gridApi) {
            // console.log(gridApi);
            // console.log("curr", addData);
            gridApi.applyTransactionAsync({ add: addData , addIndex: 0});
            if(removeData.length) {
                console.log("REMOVING FROM GRID", removeData.length);
                gridApi.applyTransactionAsync({ remove: removeData});
            }
        }
        console.log("Total Length", allData.length);
    },[gridApi,addData]);


    const disconnect = () => {
        socket.emit('disconnect', {'id':1})
    }

    const onUpdate = (ric, price) => {
         console.log("Recevied from child", ric, price);
         if("number" !== typeof parseInt(price))return;
         let temp = ricList
         temp[ric] = parseInt(price)
         setricList(temp)
     }

    const onTimeUpdate = (whichtime, newtime) => {
          console.log("Recevied from child", whichtime, newtime);
          if("number" !== typeof parseInt(newtime))return;
          let temp = replayDict
          temp[whichtime] = parseInt(newtime)
          setReplayDict(temp)
     }

    const onFreqUpdate =  (newFrequency) => {
          console.log("Got Freq update");
          setFrequency(parseInt(newFrequency))
    }

    const onSend = () => socket.emit('thresholdUpdate', ricList)

    const onSend2 = () => socket.emit('frequencyUpdate', {'frequency' : parseInt(frequency)})

    const onSend3 = () => {
         let replaying = replayDict.replayMode
         if(!replaying){
             socket.emit('toggle_replay',
             {'start': replayDict.starttime, 'end': replayDict.endtime})
         }
         else{
             socket.emit('toggle_replay', {'start': 0, 'end': 0})
         }
         let temp = replayDict
         temp.replayMode = !temp.replayMode
         setReplayDict(temp)
     }

    const getRowStyle = params => {
        let ric = params.node.data.ric
        let price = params.node.data.price
        let threshold = params.node.data.threshold
        if(price > threshold) return { background: 'green' }
        else return { background: 'red' }
    };


    return (
        <div >
        <div   style={{ display: 'flex',alignItems: 'center',ustifyContent: 'center', }}>
            <form className="Form1">
                {Object.keys(ricList).map(key =>
                    <InputField
                        onChildChange={onUpdate}
                        key={key}
                        threshold={ricList[key]}
                        label={key}
                        name={key}
                    />
                )
                }
            </form>
            <button onClick={onSend}>Update Threshold</button>
        </div>
        <br></br>
        <p>Give number of mins to go behind, for last 5 mins 0 - 5, for last 4 mins 1 - 5</p>
        <p>starttime can accept 0-4, endtime can accept 1-5</p>
        <TimeInputField time={replayDict.starttime} label={'starttime'} name={'starttime'} onChildChange={onTimeUpdate}/>
        <br></br>
        <TimeInputField time={replayDict.endtime} label={'endtime'} name={'endtime'} onChildChange={onTimeUpdate}/>
        <br></br>
        {replayDict.replayMode ?
            <button onClick={onSend3}>End Replay</button>
            : <button onClick={onSend3}>Start Replay</button>
        }
        <br></br>
        <div className="ag-theme-alpine" style={{height: 1000, width: 800 }}>
            <AgGridReact
                pagination={true}
                onGridReady={onGridReady}
                asyncTransactionWaitMillis ={50}
                columnDefs={[
                  {headerName: 'RIC', field: 'ric', sortable:true, filter:true},
                  {headerName: 'PRICE', field: 'price',sortable:true ,volatile: true},
                  {headerName: 'Threshold', field: 'threshold'},
                  {headerName: 'TickTime', field: 'tickTime'}
                ]}
                context={{ricList}}
                getRowStyle={getRowStyle}>
            </AgGridReact>
        </div>
        <br></br>
        <div style={{ display: 'flex',alignItems: 'center',ustifyContent: 'center', }}>
            <form className="Form2">
                    <FrequencyField
                        onChildChange={onFreqUpdate}
                        label={'frequency'}
                        name={'frequency'}
                        frequency={frequency}
                    />
            </form>
            <button onClick={onSend2}>Update Frequency</button>
        </div>
        </div>
    );
};
//
//
export default MyGrid;


// how the server works
// replay
// graphs
// ohlc
// deploy
// post request
