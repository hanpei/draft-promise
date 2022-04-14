enum State {
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
  REJECTED = 'rejected',
}

type Resolve<T> = (value: T) => void;
type Reject = (reason: any) => void;
type OnFulfilled<T> = (data: T) => any | undefined | null;
type OnRejected = (err: any) => any | undefined | null;
type Executor<T> = (resovle: Resolve<T>, reject: Reject) => void;

type Callback<T> = {
  resolve: Resolve<T>;
  reject: Reject;
  onFulfilled?: OnFulfilled<T>;
  onRejected?: OnRejected;
};

const task = queueMicrotask || setTimeout;

const isFunction = (value: any): value is Function =>
  typeof value === 'function';

const isObject = (value: any): value is Object =>
  Object.prototype.toString.call(value) === '[object Object]';

const isMyPromise = <T>(value: any): value is MyPromise<T> =>
  value instanceof MyPromise;

const isThenable = (value: any): boolean =>
  (isFunction(value) || isObject(value)) && 'then' in value;

class MyPromise<T> {
  private state: State = State.PENDING;
  private result: any;
  private callbacks: Callback<T>[] = [];

  constructor(executor: Executor<T>) {
    const onFulfilled: OnFulfilled<T> = (value) =>
      this.transition(State.FULFILLED, value);
    const onRejected: OnRejected = (reason) =>
      this.transition(State.REJECTED, reason);

    let ignore: boolean = false;
    const resolve: Resolve<T> = (value) => {
      if (ignore) return;
      ignore = true;
      this.resovlePromise(value, onFulfilled, onRejected);
    };

    const reject: Reject = (reason) => {
      if (ignore) return;
      ignore = true;
      onRejected(reason);
    };

    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }

  private transition(state: State, result: any) {
    if (this.state !== State.PENDING) return;

    this.state = state;
    this.result = result;
    task(this.handleAllCallbacks.bind(this));
  }

  private handleAllCallbacks() {
    // 执行所有的回调并清空
    this.callbacks.forEach((callback) => this.handleCallback(callback));
    this.callbacks = [];
  }

  public then(onFulfilled?: OnFulfilled<T>, onRejected?: OnRejected) {
    return new MyPromise((resolve, reject) => {
      const callback: Callback<T> = {
        resolve,
        reject,
        onFulfilled,
        onRejected,
      };

      if (this.state === State.PENDING) {
        this.callbacks.push(callback);
        return;
      }

      task(this.handleCallback.bind(this, callback));
    });
  }
  public catch(onRejected?: OnRejected) {
    return this.then(undefined, onRejected);
  }

  private handleCallback(callback: Callback<T>) {
    const { resolve, reject, onFulfilled, onRejected } = callback;

    try {
      if (this.state === State.FULFILLED) {
        isFunction(onFulfilled)
          ? resolve(onFulfilled(this.result))
          : resolve(this.result);
        return;
      }
      if (this.state === State.REJECTED) {
        isFunction(onRejected)
          ? resolve(onRejected(this.result))
          : reject(this.result);
      }
    } catch (err) {
      reject(err);
    }
  }

  private resovlePromise(
    value: any,
    onFulfilled: OnFulfilled<T>,
    onRejected: OnRejected
  ) {
    if (value === this) {
      return onRejected(
        new TypeError(' Chaining cycle detected for promise #<MyPromise>')
      );
    }

    if (isMyPromise<T>(value)) {
      return value.then(onFulfilled, onRejected);
    }

    if (isThenable(value)) {
      try {
        const then = value.then;
        if (isFunction(then)) {
          return new MyPromise<T>(then.bind(value)).then(
            onFulfilled,
            onRejected
          );
        }
      } catch (err) {
        return onRejected(err);
      }
    }

    onFulfilled(value);
  }
}

export default MyPromise;

// 忽略 typescript 校验
// @ts-ignore
MyPromise.defer = MyPromise.deferred = function () {
  let dfd: any = {};
  dfd.promise = new MyPromise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
};
// @ts-ignore
export = MyPromise;

new MyPromise((resolve) => {
  resolve({
    prop: 'common property',
    then(reslove2: any) {
      reslove2('promiselike');
    },
  });
}).then((res) => {
  // 真实的 Promise 这里是 promiselike
  console.log(res); // { prop: 'common property', then: [Function: then] }
});
