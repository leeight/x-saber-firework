/**
 * @file dom event
 * @author treelite(c.xinle@gmail.com)
 */

define(function (require) {

    var dom = require('saber-dom');
    var extend = require('saber-lang/extend');

    var KEY_UID = '_event_uid';
    var KEY_STOP = '_stopped';
    var UID = 0;

    /**
     * 插件
     *
     * @inner
     * @type {Array}
     */
    var plugins = [];

    /**
     * EventHost对象集合
     *
     * @inner
     * @type {Object}
     */
    var eventHosts = {};

    /**
     * 判断是否是函数
     *
     * @inner
     * @param {*} fn
     * @return {boolean}
     */
    function isFunction(fn) {
        return typeof fn == 'function';
    }

    /**
     * 获取事件对应的插件
     *
     * @inner
     * @param {string} type 事件类型
     * @return {Object}
     */
    function getPlugin(type) {
        var res;

        plugins.some(function (plugin) {
            if (plugin.detect(type)) {
                res = plugin;
            }
            return !!res;
        });

        return res;
    }

    /**
     * 判断元素是否是选择器指定的元素
     *
     * @inner
     * @param {HTMLElement} target
     * @param {string} selector
     * @param {HTMLElement} main
     * @return {HTMLElement}
     */
    function matchElement(target, selector, main) {
        var res = false;
        var eles = dom.queryAll(selector, main);
        eles.some(function (ele) {
            return res = ele == target;
        });
        return res;
    }

    /**
     * 获取事件处理函数
     *
     * @inner
     * @param {EventHost} eventHost
     * @param {Event} e
     * @return {Array}
     */
    function getHandlers(eventHost, e) {
        var target = e.target;
        var type = e.type;
        var res = [];
        var handlers = eventHost.handlers[type] || [];

        while (handlers.delegateCount && target && target != eventHost.ele) {
            var handler;
            var max = handlers.delegateCount;
            for (var i = 0; i < max && (handler = handlers[i]); i++) {
                if (matchElement(target, handler.selector, eventHost.ele)) {
                    var item = extend({}, handler);
                    item.thisArg = target;
                    res.push(item);
                }
            }
            target = target.parentNode;
        }

        res = res.concat(handlers.slice(handlers.delegateCount || 0));

        return res;
    }
    
    /**
     * 生成统一的事件处理函数
     *
     * @inner
     * @param {EventHost} eventHost
     * @return {Function}
     */
    function createCommonEventHandler(eventHost) {
        return function (e) {

            var handlers = getHandlers(eventHost, e);

            e = mixinEvent(e);

            // fire event handler
            handlers.some(function (handler) {
                var thisArg = handler.thisArg || eventHost.ele;
                var res = handler.fn.call(thisArg, e);

                if (res === false) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                return e.isPropagationStopped();
            });

        };
    }

    /**
     * 绑定事件
     * 先判断是否是手势
     * 然后再分别绑定事件
     *
     * @inner
     * @param {EventHost} eventHost
     * @param {string} type 事件类型
     */
    function addEvent(eventHost, type) {
        var fn = eventHost.commonEventHandler;
        var plugin = getPlugin(type);

        if (plugin) {
            plugin.on(eventHost.ele, type, fn);
        }
        else {
            eventHost.ele.addEventListener(type, fn, false);
        }
    }

    /**
     * 移除事件绑定
     *
     * @inner
     * @param {EventHost} eventHost
     * @param {string} type 事件类型
     */
    function removeEvent(eventHost, type) {
        var fn = eventHost.commonEventHandler;
        var plugin = getPlugin(type);

        if (plugin) {
            plugin.off(eventHost.ele, type, fn);
        }
        else {
            eventHost.ele.removeEventListener(type, fn, false);
        }
    }

    /**
     * 混合事件参数
     *
     * @inner
     * @param {Event} e
     * @return {Event}
     */
    function mixinEvent(e) {
        var fn = e.stopPropagation;

        e.stopPropagation = function () {
            fn.call(this);
            e[KEY_STOP] = true;
        };

        e.isPropagationStopped = function () {
            return !!e[KEY_STOP];
        };

        return e;
    }

    /**
     * 获取元素的uid
     * 
     * @inner
     * @param {HTMLElement} ele
     * @return {number}
     */
    function getUID(ele) {
        return ele[KEY_UID];
    }
    
    /**
     * 创建元素的uid
     * 
     * @inner
     * @param {HTMLElement} ele
     * @return {number}
     */
    function createUID(ele) {
        var id = ++UID;
        ele[KEY_UID] = id;
        return id;
    }

    /**
     * 移除元素的uid
     *
     * @inner
     * @param {HTMLElement} ele
     */
    function removeUID(ele) {
        try {
            delete ele[KEY_UID];
        }
        catch (e) {}
    }

    /**
     * EventHost
     *
     * @constructor
     */
    function EventHost(ele) {
        this.uid = createUID(ele);
        this.ele = ele;
        this.handlers = {};
        this.commonEventHandler = createCommonEventHandler(this);
        eventHosts[this.uid] = this;
    }

    /**
     * 事件绑定
     *
     * @public
     * @param {string} type 事件类型
     * @param {string=} selector 子元素选择器
     * @param {Function} fn 事件处理函数
     */
    EventHost.prototype.on = function (type, selector, fn) {
        if (isFunction(selector)) {
            fn = selector;
            selector = undefined;
        }

        var handlers = this.handlers[type];
        if (!handlers) {
            handlers = this.handlers[type] = [];
            handlers.delegateCount = 0;
            addEvent(this, type);
        }

        var handler = {
                fn: fn,
                selector: selector
            };

        if (selector) {
            handlers.delegateCount++;
            handlers.splice(handlers.delegateCount - 1, 0, handler);
        }
        else {
            handlers.push(handler);
        }
    };

    /**
     * 事件卸载
     *
     * @public
     * @param {string} type 事件类型
     * @param {string} selector 子元素选择器
     * @param {Function} fn 事件处理函数
     */
    EventHost.prototype.off = function (type, selector, fn) {
        if (isFunction(selector)) {
            fn = selector;
            selector = undefined;
        }

        var handlers = this.handlers[type] || [];

        handlers.some(function (item, index) {
            var res = false;
            if (item.fn == fn && item.selector == selector) {
                handlers.splice(index, 1);
                res = true;
            }
            return res;
        });

        if (handlers.length <= 0) {
            removeEvent(this, type);
        }
    };

    /**
     * dispose
     *
     * @public
     */
    EventHost.prototype.dispose = function () {
        var me = this;
        removeUID(me.ele);
        Object.keys(me.handlers).forEach(function (type) {
            removeEvent(me, type);
        });
        this.ele = null;
    };

    /**
     * 根据元素生成EventHost对象
     *
     * @inner
     * @param {HTMLElement} ele
     * @return {EventHost}
     */
    function generateEventHost(ele) {
        var uid = getUID(ele);
        if (uid) {
            return eventHosts[uid];
        }
        else {
            return new EventHost(ele);
        }
    }

    var exports = {};


    /**
     * 事件绑定
     *
     * @public
     * @param {HTMLElement} ele DOM元素
     * @param {string} type 事件类型
     * @param {string} selector 子元素选择器
     * @param {Function} fn 事件处理函数
     */
    exports.on = function (ele, type, selector, fn) {
        var host = generateEventHost(ele);
        host.on(type, selector, fn);
    };

    /**
     * 事件卸载
     *
     * @public
     * @param {HTMLElement} ele DOM元素
     * @param {string} type 事件类型
     * @param {string} selector 子元素选择器
     * @param {Function} fn 事件处理函数
     */
    exports.off = function (ele, type, selector, fn) {
        var host = generateEventHost(ele);
        host.off(type, selector, fn);
    };

    /**
     * 绑定一次性事件
     *
     * @public
     * @param {HTMLElement} ele DOM元素
     * @param {string} type 事件类型
     * @param {string} selector 子元素选择器
     * @param {Function} fn 事件处理函数
     */
    exports.one = function (ele, type, selector, fn) {
        if (isFunction(selector)) {
            fn = selector;
            selector = undefined;
        }
        var handler = function () {
            var args = Array.prototype.slice.call(arguments);
            var res = fn.apply(this, args);
            exports.off(ele, type, selector, handler);
            return res;
        };

        exports.on(ele, type, selector, handler);
    };

    /**
     * 卸载所有事件绑定
     *
     * @public
     * @param {HTMLElement} ele DOM元素
     */
    exports.clear = function (ele) {
        var host = generateEventHost(ele);
        host.dispose();
    };

    /**
     * 注册插件
     *
     * @public
     * @param {}
     */
    exports.register = function (plugin) {
        if (plugin.init) {
            plugin.init();
        }
        plugins.push(plugin);
    };

    return exports;
});
