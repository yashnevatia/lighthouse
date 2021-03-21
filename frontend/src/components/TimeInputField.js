
import React, {  useState } from 'react';
import { render } from 'react-dom';

function TimeInputField({name,label,time,onChildChange}) {
  const [timeState, settimeState] = useState(time)

  const onInputFieldChange = (evt) => {
      console.log("onInputFieldChange");
      const newtime = evt.target.value
      console.log(newtime);
      settimeState(newtime)
      console.log("Sending to parent");
      onChildChange(name, newtime)
  }

  return (
      <div>
     <label>{label}</label>
      <input type="text"
      value={timeState}
      name={name}
      onChange={onInputFieldChange} />
    </div>
  );

}
// TimeInputField.defaultProps = {
//     label: 'starttime',
//     name:'endtime',
//     time:0
// }

export default TimeInputField;
