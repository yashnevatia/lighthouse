
import React, {  useState } from 'react';
import { render } from 'react-dom';

function FrequencyField({name,label,onChildChange,frequency}) {
  const [frequencyState, settfrequencyState] = useState(frequency)

  const onInputFieldChange = (evt) => {
      console.log("onInputFieldChange");
      let new_frequency = evt.target.value
      console.log(new_frequency);
      settfrequencyState(new_frequency)
      console.log("Sending to parent");
      onChildChange(new_frequency)
  }

  return (
      <div>
     <label>{label}</label>
      <input type="text"
      value={frequencyState}
      name={name}
      onChange={onInputFieldChange}
      placeholder={'ms'}
      />
    </div>
  );

}
FrequencyField.defaultProps = {
    frequency:10
}
export default FrequencyField;
