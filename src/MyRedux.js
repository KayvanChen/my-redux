export function createStore(reducer, enhancer) {
  //判断enhancer是否存在并且是一个函数
  if (typeof enhancer == "function") {
    // 调用 enhancer ,返回一个增强版的 store creator————通过函数柯里化实现，本质是对createStore进行缓存
    // 所以，enhancer的入参为createStore函数，返回的也是一个createStore函数
    // 值得注意的是，Redux中提供了另一个函数，applyMiddleware，作用是生成enhancer函数
    // 所以，这里的关系应该是applyMiddleware=>enhancer=>reducer，这个关系将在applyMiddleware中实现
    return enhancer(createStore)(reducer);
  } else {
    // 没有中间件时的redux：
    // 创建保存数据和订阅函数的变量
    let curState,
      curListeners = [];
    // getState方法：返回当前store中的数据
    const getState = () => {
      return curState;
    };
    // dispatch方法：执行改变store的方法
    const dispatch = (action) => {
      // 外部定义的reducer，用来改变store中的数据
      // reducer中能够获取到store的当前值和需要执行的方法类型（方便存储多种方法）
      curState = reducer(curState, action);
      // reducer改变store中的数据后执行订阅的监听函数：
      curListeners.forEach((fn) => {
        fn();
      });
    };
    // 创建store的时候将reducer中的初始值写入curState
    dispatch({ type: "aNeverUsedString" });
    // subscribe订阅函数：将需要在dispatch之后执行的函数存到curListeners中
    const subscribe = (listener) => {
      curListeners.push(listener);
    };
    // 返回三个核心方法：
    return {
      getState,
      dispatch,
      subscribe,
    };
  }
}

export function combineReducers(reducers) {
  //保存reducer集合的keys
  const reducerKeys = Object.keys(reducers);

  //reducers的深拷贝
  const finalReducers = {};
  // copy reducers 整个列表
  for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i];

    if (typeof reducers[key] === "function") {
      finalReducers[key] = reducers[key];
    }
  }

  //获取 所有 reducer 名称，作为闭包给内嵌函数使用
  const finalReducerKeys = Object.keys(finalReducers);

  //合并reducers 时，返回 reducer 的包裹函数
  return function combination(state = {}, action) {
    //判断dispatch是否改变了store中存储的数据
    let hasChanged = false;
    //存储新的状态
    const nextState = {};

    //遍历执行每一个reducer，更新store中存储的数据
    for (let i = 0; i < finalReducerKeys.length; i++) {
      //获取reducer对应的key和reducer函数
      const key = finalReducerKeys[i];
      const reducer = finalReducers[key];

      //获取对应 reducer 的 state，并调用真实的 reducer
      const previousStateForKey = state[key];
      const nextStateForKey = reducer(previousStateForKey, action);

      //更新一下状态
      nextState[key] = nextStateForKey;
      //标记一下数据是否被改变
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    //如果数据没有被改变则返回旧的state,反之则返回新的state
    return hasChanged ? nextState : state;
  };
  //通过对combineReducer的分析可以知道，action中的type不能重复。
}

// 职责链模式：
export function applyMiddleware(...middlewares) {
  // 第一次return：存储中间件的内容
  return (createStore) =>
    // 第二次return：存储createStore方法
    (...args) =>
      // 第三次return：存储reducer
      {
        //以下是对createStore的增强：
        //首先，把全部reducer函数穿进去，生成一个无中间件的store仓库
        const store = createStore(...args);
        //拷贝store中dispatch方法
        let dispatch = store.dispatch;
        // 传入store中的数据和dispatch方法，执行中间件中的自定义函数，生成传入的dispatch方法集合
        const middlewaresChain = middlewares.map((middleware) =>
          // 第一次执行中间件，存入getState方法
          middleware(store.getState)
        );
        // 把所有的中间件函数集成到新的dispatch方法中。并第二次执行中间件，存入dispatch方法
        dispatch = compose(...middlewaresChain)(dispatch);
        // 把新的dispatch方法和store中的subscribe,dispatch方法导出
        return {
          ...store,
          // 覆盖上面store里的dispatch
          dispatch,
        };
      };
}

// 多个函数集合成一个函数方法：
// 特性：函数按照传入顺序依次执行，并将前一个函数的返回值传作为下一个函数的入参
function compose(...funcs) {
  if (funcs.length === 0) {
    // 为了满足中间件函数接收dispatch函数，返回dispatch函数的特性
    return (dispatch) => dispatch;
  }
  if (funcs.length === 1) {
    return funcs[0];
  }
  // 当中间件函数超过2时：
  // 未指定初始值时，reduce会使用第一个元素作为初始值,最终得到形如a(b(c(...)))的复合函数，并返回入参。
  return funcs.reduce((a, b) => (...args) => a(b(...args)));
}

// 中间件：打印日志
// middleApi中定义了getState, 和无中间件的dispatch方法作为入参
export function logger(getState) {
  // 第一次执行，存入getState
  return (dispatch) =>
    //第二次执行，存入dispatch方法
    (action) => {
      // 第三次执行，就可以在拥有getState、action、dispatch的环境下做自己想做的事情了
      console.log(getState(), action + "执行了");
      // 执行dispatch改变数据
      dispatch(action);
    };
}

// 中间件：执行异步函数
// 结构和打印日志中间件一样
export function thunk(getState) {
  return (dispatch) => (action) => {
    // 检查传入的action是否为函数
    if (typeof action === "function") {
      // 执行传入的函数
      action(dispatch, getState);
    } else {
      dispatch(action);
    }
  };
}

/**Redux中使用的设计模式思考：
 *  1.发布订阅模式：
 *  subscribe方法提供了订阅的方法，能够接收函数并存到store的curListeners中；
 *  dispatch的时候会遍历执行已经存到curListeners中的所有函数，完成发布订阅。
 *  
 *  2.单例模式：
 *  redux的一大特点就是只有一个state，只需要维护一个类（仓库），不同的reducer
 *  通过命名空间来划分。好处是这个仓库是唯一的，无论储存多少个变量，都只通过唯一
 *  的出口getState来访问它。坏处就是每一次dispatch都会执行全部的reducer，更新
 *  所有数据。
 *
 *  3.策略模式：
 *  store中改变状态的方法通过策略模式的方案进行了剥离。redux不负责具体的数据改变
 *  逻辑，通过reducer的形式暴露出去，用户自己编写reducer直接操作当前state并更新。
 * 
 *  4.职责链模式：
 *  职责链模式是applyMiddleware函数和中间件的核心设计思想。例如applyMiddleware函数，
 *  将多个任务：存储中间件的内容、存储createStore方法、存储reducer拆分成三个连续的
 *  柯里化函数。与职责链模式常用的AOP（面向切面编程）不同，这种职责链是隐式的，不能
 *  随意修改链的结构。
 **/
