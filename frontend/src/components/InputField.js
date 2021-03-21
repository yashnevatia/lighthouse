
import React, {  useState } from 'react';
import { render } from 'react-dom';

function InputField({name,label,threshold,onChildChange}) {
  const [thresholdState, setthresholdState] = useState(threshold)

  const onInputFieldChange = (evt) => {
      console.log("onInputFieldChange");
      const new_threshold = evt.target.value
      console.log(new_threshold);
      setthresholdState(new_threshold)
      console.log("Sending to parent");
      onChildChange(name, new_threshold)
  }

  return (
      <div>
     <label>{label}</label>
      <input type="text"
      value={thresholdState}
      name={name}
      onChange={onInputFieldChange} /> <br></br>
    </div>
  );

}
InputField.defaultProps = {
    label: 'aa',
    name:'aa'
}
export default InputField;
