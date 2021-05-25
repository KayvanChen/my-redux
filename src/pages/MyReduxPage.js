import React, { useState } from "react";
import store from "../store/myStore";

const MyReduxPage = () => {
  const [count, setCount] = useState(store.getState());

  return (
    <>
      <div>count1:{count.count1}</div>
      <div>count2:{count.count2}</div>
      <button
        onClick={() => {
          store.dispatch(dispatch => {
            setTimeout(() => {
              dispatch({type: "add"});
              setCount(store.getState())
            }, 1000);
          });
         
        }}
      >
        add
      </button>
      <button onClick={() => {
          store.dispatch({ type: "minus" });
          setCount(store.getState())
        }}>minus</button>
    </>
  );
};

export default MyReduxPage;
