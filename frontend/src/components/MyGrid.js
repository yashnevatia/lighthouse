import React, { useEffect, useState, useRef } from 'react';
// import React, { Component } from 'react';
import { AgGridColumn, AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
import InputField from './InputField';
// import FrequencyField from './FrequencyField';
// import TimeInputField from './TimeInputField';
import Button from 'react-bootstrap/Button'
import FormControl from 'react-bootstrap/FormControl'
import Form from 'react-bootstrap/Form'
import 'bootstrap/dist/css/bootstrap.min.css'

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
    const [feedOn, setFeedOn] = useState(1);

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

    const onTUpdate = (evt) => {
          console.log("Recevied update", evt.target, evt.target.value);
          let temp = ricList
          temp[evt.target.id] = parseInt(evt.target.value)
          setricList(temp)
      }

    const onTimeUpdate = (evt) => {
           console.log("Recevied update", evt.target, evt.target.value);
           let temp = replayDict
           temp[evt.target.id] = parseInt(evt.target.value)
           setReplayDict(temp)
      }

    const onFreqUpdate =  (evt) => {
          console.log("Got Freq update", evt.target);
          setFrequency(parseInt(evt.target.value))
    }

    const sendThreshold = () => socket.emit('thresholdUpdate', ricList)

    const sendFrequency = () => {
        console.log("Emitting frequency update");
        socket.emit('frequencyUpdate', {'frequency' : frequency})
    }

    const onSendReplay = () => {
        console.log("reaching here");
         let replaying = replayDict.replayMode
         if(!replaying){
             console.log("reaching here 1");
             socket.emit('toggle_replay',
             {'start': replayDict.starttime, 'end': replayDict.endtime})

         }
         else{
             socket.emit('toggle_replay', {'start': 0, 'end': 0})
         }
         // let temp = replayDict
         // temp.replayMode = !temp.replayMode
         // setReplayDict(temp)
     }

    // const toggleFeed = () => {
    //     console.log("sending toggle feed");
    //     socket.emit('toggle_feed', {'data': feedOn})
    //     setFeedOn(!feedOn)
    // }

    const getRowStyle = params => {
        let ric = params.node.data.ric
        let price = params.node.data.price
        let threshold = params.node.data.threshold
        if(price > threshold) return { background: 'green' }
        else return { background: 'red' }
    };

    return (
        <div className='ml-2'>
        <div style={{width:'50%'}}>
            <Form>
                {Object.keys(ricList).map(key =>
                <Form.Group controlId={key}>
                    <Form.Label column="sm">{key}</Form.Label>
                    <Form.Control size="sm" type="number" placeholder={ricList[key]} onChange={onTUpdate}/>
                </Form.Group>
                )
                }
            <Button onClick={sendThreshold}>Update Threshold</Button>
            </Form>
        </div>
        <br></br>
        <div style={{width:'50%'}}>

        </div>
        <br></br>
        <div className="ag-theme-alpine" style={{height: 1000, width: 800 }}>
            <AgGridReact
                pagination={true}
                onGridReady={onGridReady}
                asyncTransactionWaitMillis ={50}
                columnDefs={[
                  {headerName: 'Ric', field: 'ric', sortable:true, filter:true},
                  {headerName: 'Price', field: 'price',sortable:true ,volatile: true},
                  {headerName: 'Threshold', field: 'threshold'},
                  {headerName: 'Tick Time', field: 'tickTime'}
                ]}
                context={{ricList}}
                getRowStyle={getRowStyle}>
            </AgGridReact>
        </div>
        <br></br>
        <div style={{width:'50%'}}>
        <Form>
          <Form.Group controlId="formFrequency">
            <Form.Label>Frequency</Form.Label>
            <Form.Control type="number" placeholder={frequency} onChange={onFreqUpdate}/>
            <Form.Text className="text-muted">
              Input frequency in ms
            </Form.Text>
            <Button onClick={sendFrequency}>Update Frequency</Button>
          </Form.Group>
        </Form>
        <div style={{width:'50%'}}>
            <Form>
                <Form.Group controlId={'starttime'}>
                    <Form.Label>{'Replay Start Time'}</Form.Label>
                    <Form.Control type="number" placeholder={replayDict.starttime} onChange={onTimeUpdate}/>
                    <Form.Text className="text-muted">
                      Can accept values 0-4
                    </Form.Text>
                </Form.Group>
                <Form.Group controlId={'endtime'}>
                    <Form.Label>{'Replay End Time'}</Form.Label>
                    <Form.Control type="number" placeholder={replayDict.endtime} onChange={onTimeUpdate}/>
                    <Form.Text className="text-muted">
                      Can accept values 1-5
                    </Form.Text>
                </Form.Group>
                {replayDict.replayMode ?
                    <Button onClick={onSendReplay} variant="failure">End Replay</Button>
                    :<Button onClick={onSendReplay} variant="success">Start Replay</Button>
                }
            </Form>
        </div>
        </div>
        </div>
    );
};
//
//// <Button>Update Threshold
export default MyGrid;


// <form className="Form2">
//         <FrequencyField
//             onChildChange={onFreqUpdate}
//             label={'frequency'}
//             name={'frequency'}
//             frequency={frequency}
//         />
// </form>
// <Button onClick={onSend2}>Update Frequency</Button>
//style={{ display: 'flex',alignItems: 'center',ustifyContent: 'center', }}
 // style={{ display: 'flex',alignItems: 'center',ustifyContent: 'center', }}
// how the server works
// replay
// graphs
// ohlc
// deploy
// post request
// style={{ display: 'flex',alignItems: 'center',ustifyContent: 'center', }}
// <InputField
//     onChildChange={onUpdate}
//     key={key}
//     threshold={ricList[key]}
//     label={key}
//     name={key}

// <TimeInputField time={replayDict.starttime} label={'starttime'} name={'starttime'} onChildChange={onTimeUpdate}/>
// <br></br>
// <TimeInputField time={replayDict.endtime} label={'endtime'} name={'endtime'} onChildChange={onTimeUpdate}/>
// />
// {feedOn ?
//     <Button onClick={toggleFeed} variant="failure">Stop Feed</Button>
//     :<Button onClick={toggleFeed} variant="success">Start Feed</Button>
// }
