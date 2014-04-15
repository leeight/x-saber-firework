/**
 * @file Action
 * @author treelite(c.xinle@gmail.com)
 */

define(function (require) {

    var inherits = require('saber-lang/inherits');
    var extend = require('saber-lang/extend');
    var bind = require('saber-lang/bind');
    var router = require('saber-router');
    var Resolver = require('saber-promise');

    var Abstract = require('./Abstract');
    var View = require('./View');
    var Model = require('./Model');

    /**
     * 绑定事件
     *
     * @inner
     */
    function bindEvents(action) {
        var events = action.events || {};

        var fn;
        Object.keys(events).forEach(function (name) {
            fn = events[name];
            // 没有':'表示action事件
            if (name.indexOf(':') < 0) {
                action.on(name, fn);
            }
            // 有':'表示绑定组件事件(view或者model的事件)
            // e.g: view:add
            else {
                var items = name.split(':');
                var item = items[0].trim();
                if (item && items[1]) {
                    action[item].on(items[1].trim(), bind(fn, action));
                }
            }
        });
    }

    /**
     * Action
     *
     * @constructor
     * @param {Object} options 配置参数
     * @param {Object} options.view view配置项
     * @param {Object} options.model model配置项
     * @param {Object=} options.events 事件（包括action事件与组件事件）
     */
    function Action(options) {
        Abstract.call(this);

        extend(this, options);

        // 创建model
        this.model = new Model(this.model || {});
        // 创建view
        this.view = new View(this.view || {});

        this.emit('init');
    }

    inherits(Action, Abstract);

    /**
     * 加载页面
     *
     * 页面入口
     * 完成数据请求，页面渲染
     *
     * @public
     * @param {string} url 当前的访问地址
     * @param {Object} query 查询条件
     * @param {HTMLElement} main 视图容器
     */
    Action.prototype.enter = function (url, query, main) {
        this.url = url;
        this.query = extend({}, query);

        this.view.beforeRender(main);
        this.emit('enter');

        return this.model.fetch(this.query)
                .then(bind(this.view.render, this.view));
    };

    /**
     * 页面跳转
     *
     * @public
     * @param {string} url 跳转地址
     * @param {Object} query 查询条件
     * @param {boolean=} force 强制跳转`
     */
    Action.prototype.redirect = function (url, query, force) {
        router.redirect(url, query, force);
    };

    /**
     * 唤醒页面
     *
     * @public
     * @param {string} url 当前的访问地址
     * @param {Object} query 查询条件
     */
    Action.prototype.wakeup = function (url, query) {
        this.url = url;
        this.query = extend({}, query);

        this.emit('wakeup');
        this.view.wakeup();
        return Resolver.resolved();
    };

    /**
     * 页面就绪
     * 完成页面渲染转场后触发
     * 进行事件注册
     *
     * @public
     */
    Action.prototype.ready = function () {
        bindEvents(this);
        this.view.ready();
        this.emit('ready');
    };

    /**
     * 页面呈现完成
     * 业务逻辑处理的主要入口
     *
     * @public
     */
    Action.prototype.complete = function () {
        this.emit('complete');
    };

    /**
     * 页面离开
     *
     * @public
     */
    Action.prototype.leave = function () {
        this.emit('leave');
        this.dispose();
    };

    /**
     * 页面休眠
     *
     * @public
     */
    Action.prototype.sleep = function () {
        this.emit('sleep');
        this.view.sleep();
    };

    /**
     * 页面卸载
     *
     * @public
     */
    Action.prototype.dispose = function () {
        this.view.dispose();
        this.model.dispose();
    };

    return Action;
});
