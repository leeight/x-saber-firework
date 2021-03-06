/**
 * @file view spec
 * @author treelite(c.xinle@gmail.com)
 */

define(function (require) {

    var dom = require('saber-dom');
    var Abstract = require('saber-firework/Abstract');
    var View = require('saber-firework/View');

    function fireEvent(ele, type, proto) {
        var e = document.createEvent('Event');
        e.initEvent(type, true, true);
        if (proto) {
            extend(e, proto);
        }
        ele.dispatchEvent(e);
    }

    describe('View', function () {

        var main;

        beforeEach(function () {
            main = document.createElement('div');
            main.style.cssText += ';position:absolute;top:-1000px;left:-1000px';
            document.body.appendChild(main);
        });

        afterEach(function () {
            document.body.removeChild(main);
            main = null;
        });

        it('should inherited abstract', function () {
            var view = new View();
            expect(view instanceof Abstract).toBeTruthy();
        });

        it('should compile template only once', function () {
            var config = {
                    templateMainTarget: 'targetMain',
                    template: '<!-- target:targetMain -->hello'
                };

            var pass = true;
            try {
                var view = new View(config);
                view = new View(config);
            }
            catch (e) {
                pass = false;
            }
            expect(pass).toBeTruthy();
        });

        it('.setMain(ele) should set main element', function () {
            var view = new View();

            view.setMain(main);

            expect(view.main).toBe(main);
        });

        it('.render() should render view', function () {
            var data = {name: 'treelite'};
            var tpl = '<!-- target:renderMain -->${name}';
            var view = new View({
                    template: tpl,
                    templateMainTarget: 'renderMain',
                    main: main,
                });

            view.render(data);

            expect(main.innerHTML).toEqual(data.name);
        });

        it('.ready() should bind dom events', function (done) {
            var tpl = '<!-- target:readyMain --><div class="box"><div class="inner"></div></div>';
            var fn = jasmine.createSpy('fn');
            var view = new View({
                    main: main,
                    template: tpl,
                    templateMainTarget: 'readyMain',
                    domEvents: {
                        'click:.box': fn
                    }
                });

            view.render();
            view.ready();

            fireEvent(dom.query('.inner', main), 'click');

            setTimeout(function () {
                expect(fn.calls.count()).toBe(1);
                done();
            }, 0);
        });

        it('.dispose() should detach all dom events', function (done) {
            var tpl = '<!-- target:disposeMain --><div class="box"><div class="inner"></div></div>';
            var fn = jasmine.createSpy('fn');
            var view = new View({
                    main: main,
                    template: tpl,
                    templateMainTarget: 'disposeMain',
                    domEvents: {
                        'click:.box': fn,
                        'click': fn
                    }
                });

            view.render();
            view.ready();
            view.dispose();

            fireEvent(dom.query('.inner', main), 'click');

            setTimeout(function () {
                expect(fn.calls.count()).toBe(0);
                done();
            }, 0);
        });
    });

});
