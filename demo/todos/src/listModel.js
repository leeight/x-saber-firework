/**
 * @file model
 * @author treelite(c.xinle@gmail.com)
 */

define(function (require) {

    var Resolver = require('saber-promise');

    var todos = [
        {id: 1001, title: 'hello', completed: false},
        {id: 1002, title: 'world', completed: false},
        {id: 1003, title: 'something', completed: true}
    ];
    
    var config = {};

    config.fetch = function (query) {
        var res = {};
        res.todos = [];
        if (query.filter) {
            res.todos = todos.filter(function (item) {
                return item.completed == (query.filter == 'complete');
            });
        }
        else {
            res.todos = todos;
        }

        res.filter = query.filter;

        this.todos = res.todos;

        res.remainingCount = res.todos.filter(function (item) {
                return !item.completed;
            }).length;

        res.completedCount = res.todos.length - res.remainingCount;

        res.complatedAll = res.completedCount == res.todos.length;

        return Resolver.resolved(res);
    };

    config.add = function (title) {
        var item = {};   
        item.title = title;
        item.id = todos[todos.length - 1].id + 1;
        item.completed = false;
        todos.push(item);

        return Resolver.resolved(item);
    };

    config.remove = function (id) {
        todos.some(function (item, index) {
            if (id == item.id) {
                todos.splice(index, 1);
            }
            return id == item.id;
        });

        return Resolver.resolved(todos);
    };

    config.complete = function (id, completed) {
        todos.some(function (item) {
            if (item.id == id) {
                item.completed = completed;
            }
            return item.id == id;
        });

        return Resolver.resolved();
    };

    config.completeAll = function (completed) {
        todos.forEach(function (item) {
            item.completed = completed;
        });

        return Resolver.resolved();
    };

    config.clear = function () {
        todos = todos.filter(function (item) {
            return !item.completed;
        });

        return Resolver.resolved();
    };

    return config;

});
