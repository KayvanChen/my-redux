import { createStore, applyMiddleware,combineReducers, logger, thunk, } from "../MyRedux";

const countReducer = (state = 10, action) => {
  if (action.type === "add") {
    return state + 1;
  } else if (action.type === "minus") {
    return state - 1;
  } else {
    return state;
  }
};
function countReducer2(state = 20, action) {
  switch (action.type) {
    case "add":
      return state + 1;
    case "minus":
      return state - 1;
    default:
      return state;
  }
}

const allReducer = combineReducers({
  count1: countReducer,
  count2: countReducer2,
});

const store = createStore(allReducer, applyMiddleware(logger, thunk));

export default store;
