import './App.css';
import React, { useEffect, useState, useRef } from 'react';
import MyGrid from './components/MyGrid'
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

function App() {

  return (
     <div >
     <h2>Lighthouse</h2>
      <MyGrid gridType='ric_data' />
    </div>
  );
}
export default App
