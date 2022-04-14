"use strict";
var State;
(function (State) {
    State["PENDING"] = "pending";
    State["FULFILLED"] = "fulfilled";
    State["REJECTED"] = "rejected";
})(State || (State = {}));
var task = queueMicrotask || setTimeout;
var isFunction = function (value) {
    return typeof value === 'function';
};
var isObject = function (value) {
    return Object.prototype.toString.call(value) === '[object Object]';
};
var isMyPromise = function (value) {
    return value instanceof MyPromise;
};
var isThenable = function (value) {
    return (isFunction(value) || isObject(value)) && 'then' in value;
};
var MyPromise = /** @class */ (function () {
    function MyPromise(executor) {
        var _this = this;
        this.state = State.PENDING;
        this.callbacks = [];
        var onFulfilled = function (value) {
            return _this.transition(State.FULFILLED, value);
        };
        var onRejected = function (reason) {
            return _this.transition(State.REJECTED, reason);
        };
        var ignore = false;
        var resolve = function (value) {
            if (ignore)
                return;
            ignore = true;
            _this.resovlePromise(value, onFulfilled, onRejected);
        };
        var reject = function (reason) {
            if (ignore)
                return;
            ignore = true;
            onRejected(reason);
        };
        try {
            executor(resolve, reject);
        }
        catch (error) {
            reject(error);
        }
    }
    MyPromise.prototype.transition = function (state, result) {
        if (this.state !== State.PENDING)
            return;
        this.state = state;
        this.result = result;
        task(this.handleAllCallbacks.bind(this));
    };
    MyPromise.prototype.handleAllCallbacks = function () {
        var _this = this;
        // 执行所有的回调并清空
        this.callbacks.forEach(function (callback) { return _this.handleCallback(callback); });
        this.callbacks = [];
    };
    MyPromise.prototype.then = function (onFulfilled, onRejected) {
        var _this = this;
        return new MyPromise(function (resolve, reject) {
            var callback = {
                resolve: resolve,
                reject: reject,
                onFulfilled: onFulfilled,
                onRejected: onRejected
            };
            if (_this.state === State.PENDING) {
                _this.callbacks.push(callback);
                return;
            }
            task(_this.handleCallback.bind(_this, callback));
        });
    };
    MyPromise.prototype["catch"] = function (onRejected) {
        return this.then(undefined, onRejected);
    };
    MyPromise.prototype.handleCallback = function (callback) {
        var resolve = callback.resolve, reject = callback.reject, onFulfilled = callback.onFulfilled, onRejected = callback.onRejected;
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
        }
        catch (err) {
            reject(err);
        }
    };
    MyPromise.prototype.resovlePromise = function (value, onFulfilled, onRejected) {
        if (value === this) {
            return onRejected(new TypeError(' Chaining cycle detected for promise #<MyPromise>'));
        }
        if (isMyPromise(value)) {
            return value.then(onFulfilled, onRejected);
        }
        if (isThenable(value)) {
            try {
                var then = value.then;
                if (isFunction(then)) {
                    return new MyPromise(then.bind(value)).then(onFulfilled, onRejected);
                }
            }
            catch (err) {
                return onRejected(err);
            }
        }
        onFulfilled(value);
    };
    return MyPromise;
}());
exports["default"] = MyPromise;
// 忽略 typescript 校验
// @ts-ignore
MyPromise.defer = MyPromise.deferred = function () {
    var dfd = {};
    dfd.promise = new MyPromise(function (resolve, reject) {
        dfd.resolve = resolve;
        dfd.reject = reject;
    });
    return dfd;
};
new MyPromise(function (resolve) {
    resolve({
        prop: 'common property',
        then: function (reslove2) {
            reslove2('promiselike');
        }
    });
}).then(function (res) {
    // 真实的 Promise 这里是 promiselike
    console.log(res); // { prop: 'common property', then: [Function: then] }
});
module.exports = MyPromise;
