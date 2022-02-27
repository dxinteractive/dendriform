import {useDendriform, Dendriform, noChange, sync, useSync, immerable, cancel, Plugin} from '../src/index';
import {renderHook, act} from '@testing-library/react-hooks';
import {BASIC, OBJECT, ARRAY} from 'dendriform-immer-patch-optimiser';

import React from 'react';
import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {enableMapSet} from 'immer';

jest.useFakeTimers();

Enzyme.configure({
    adapter: new Adapter()
});

enableMapSet();

type MyComponentProps<V> = {
    foo: number;
    bar?: number;
    form: Dendriform<V>;
};

type MyComponentIndexProps<V> = {
    foo: number;
    bar?: number;
    form: Dendriform<V>;
    index: number;
};

type NotSetTestValue = {
    foo?: string;
    bar?: string;
};

type PluginValue = {
    foo: boolean;
    bar: boolean;
};

describe(`Dendriform`, () => {

    describe(`value and change`, () => {

        test(`should contain value`, () => {
            const form = new Dendriform(123);

            expect(form.value).toBe(123);
            expect(form.id).toBe('0');
        });

        test(`should set value`, () => {
            const form = new Dendriform(123);

            form.set(456);

            expect(form.value).toBe(456);
            expect(form.id).toBe('0');
        });

        test(`should set object value and be strictly equal`, () => {
            const form = new Dendriform({foo: false});
            const obj = {foo: true};
            form.set(obj);
            expect(form.value).toBe(obj);
        });

        test(`should set array value and NOT be strictly equal when tracking is on`, () => {
            const form = new Dendriform([123,456]);
            const arr = [456,789];
            form.set(arr);
            expect(form.value).not.toBe(arr);
        });

        test(`should set array value and be strictly equal when tracking is off`, () => {
            const form = new Dendriform([123,456]);
            const arr = [456,789];
            form.set(arr, {track: false});
            expect(form.value).toBe(arr);
        });

        test(`should set value from immer producer`, () => {
            const form = new Dendriform(1);

            form.set(draft => draft + 1);

            expect(form.value).toBe(2);
            expect(form.id).toBe('0');
        });

        test(`merging multiple sets`, () => {
            const form = new Dendriform(1);

            form.buffer();
            form.set(draft => draft + 1);
            form.set(draft => draft + 1);
            form.set(draft => draft + 1);
            form.done();

            expect(form.value).toBe(4);
            expect(form.id).toBe('0');

            form.set(draft => draft + 1);
            form.set(draft => draft + 1);

            expect(form.value).toBe(6);
        });

        test(`should set value with debounce`, () => {
            const form = new Dendriform(123);

            form.set(456, {debounce: 100});
            jest.advanceTimersByTime(80);
            expect(form.value).toBe(123);

            form.set(789, {debounce: 100});
            jest.advanceTimersByTime(80);
            expect(form.value).toBe(123);

            jest.advanceTimersByTime(800);

            expect(form.value).toBe(789);
        });
    });

    describe('useDendriform() and .useValue()', () => {
        test(`should provide value and produce an update`, () => {

            const firstHook = renderHook(() => useDendriform(123));

            const form = firstHook.result.current;
            const {result} = renderHook(() => form.useValue());
            expect(result.current).toBe(123);

            act(() => {
                form.set(456);
            });

            // should have updated from top down (same result)
            expect(result.current).toBe(456);
        });
    });

    describe('.key', () => {
        test(`should provide key`, () => {
            const form = new Dendriform({foo: 'bar'});
            expect(form.branch('foo').key).toBe('foo');
        });
    });

    describe('.index and .useIndex()', () => {
        test(`should provide index and produce an update`, () => {

            const firstHook = renderHook(() => useDendriform(['a','b','c']));

            const form = firstHook.result.current;
            const elementForm = form.branch(0);
            const {result} = renderHook(() => elementForm.useIndex());
            expect(result.current).toBe(0);

            act(() => {
                form.set(draft => {
                    draft.unshift('x');
                });
            });

            // should have updated index
            expect(result.current).toBe(1);
            expect(elementForm.index).toBe(1);

            act(() => {
                form.set(draft => {
                    draft.push('y');
                });
            });

            // should not have updated index
            expect(result.current).toBe(1);
        });

        test(`.index should not work on non-indexed form`, () => {
            const form = new Dendriform(123);
            expect(() => form.index).toThrow(`[Dendriform] useIndex() can only be called on array element forms, can't be called at path []`);
        });

        test(`.useIndex() should not work on non-indexed form`, () => {

            const firstHook = renderHook(() => useDendriform(123));

            const form = firstHook.result.current;
            const {result} = renderHook(() => form.useIndex());
            expect(result.error.message).toBe(`[Dendriform] useIndex() can only be called on array element forms, can't be called at path []`);
        });
    });

    describe('useDendriform() and .useChange()', () => {
        test(`should provide value and produce an update`, () => {

            const firstHook = renderHook(() => useDendriform(() => 123));
            const callback = jest.fn();

            const form = firstHook.result.current;
            renderHook(() => form.useChange(callback));

            act(() => {
                form.set(456);
            });

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0]).toBe(456);
        });
    });

    describe(`history`, () => {

        test(`should undo`, () => {
            const form = new Dendriform(123, {history: 100});

            expect(form.core.state.historyStack.length).toBe(0);
            expect(form.core.state.historyIndex).toBe(0);

            form.set(456);

            expect(form.core.state.historyStack.length).toBe(1);
            expect(form.core.state.historyIndex).toBe(1);

            form.set(789);

            expect(form.core.state.historyStack.length).toBe(2);
            expect(form.core.state.historyIndex).toBe(2);
            expect(form.value).toBe(789);

            form.undo();

            expect(form.value).toBe(456);
            expect(form.core.state.historyStack.length).toBe(2);
            expect(form.core.state.historyIndex).toBe(1);

            form.undo();

            expect(form.value).toBe(123);
            expect(form.core.state.historyStack.length).toBe(2);
            expect(form.core.state.historyIndex).toBe(0);

            form.undo();

            expect(form.value).toBe(123);
            expect(form.core.state.historyStack.length).toBe(2);
            expect(form.core.state.historyIndex).toBe(0);
        });

        test(`should not undo if no history is configured`, () => {
            const form = new Dendriform(123);

            form.set(456);

            form.set(789);

            expect(form.value).toBe(789);

            form.undo();

            expect(form.value).toBe(789);
        });

        test(`should undo a limited number of times`, () => {
            const form = new Dendriform(123, {history: 1});

            form.set(456);
            form.set(789);

            expect(form.value).toBe(789);

            form.undo();

            expect(form.value).toBe(456);

            form.undo();

            expect(form.value).toBe(456);
        });

        test(`should redo`, () => {
            const form = new Dendriform(123, {history: 100});

            form.set(456);
            form.buffer();

            expect(form.value).toBe(456);

            form.undo();

            expect(form.value).toBe(123);

            form.redo();

            expect(form.value).toBe(456);

            form.redo();

            expect(form.value).toBe(456);
        });

        test(`should replace redo stack after change after an undo`, () => {
            const form = new Dendriform(123, {history: 100});

            form.set(456);

            expect(form.value).toBe(456);

            form.undo();

            expect(form.value).toBe(123);

            form.set(789);

            expect(form.value).toBe(789);

            form.undo();

            expect(form.value).toBe(123);

            form.redo();

            expect(form.value).toBe(789);
        });

        test(`should go`, () => {
            const form = new Dendriform(['a'], {history: 100});

            form.set(draft => void draft.push('b'));
            form.set(draft => void draft.push('c'));
            form.set(draft => void draft.push('d'));

            expect(form.value).toEqual(['a','b','c','d']);

            form.go(-1);

            expect(form.value).toEqual(['a','b','c']);

            form.go(-2);

            expect(form.value).toEqual(['a']);

            form.go(1);

            expect(form.value).toEqual(['a','b']);

            form.go(2);

            expect(form.value).toEqual(['a','b','c','d']);

            form.go(-100);

            expect(form.value).toEqual(['a']);

            form.go(100);

            expect(form.value).toEqual(['a','b','c','d']);
        });

        test(`should go nowhere`, () => {
            const form = new Dendriform('a', {history: 100});

            form.set('b');

            expect(form.value).toBe('b');

            form.go(0);

            expect(form.value).toBe('b');
        });

        test(`should undo buffered changes`, () => {
            const form = new Dendriform(0, {history: 100});

            form.buffer();
            form.set(draft => draft + 1);
            form.set(draft => draft + 1);
            form.done();

            form.buffer();
            form.set(draft => draft + 10);
            form.set(draft => draft + 10);
            form.done();

            expect(form.value).toBe(22);

            form.undo();

            expect(form.value).toBe(2);

            form.undo();

            expect(form.value).toBe(0);

            form.go(2);

            expect(form.value).toBe(22);
        });

        test(`replace() should replace last item in history, and reset to push afterward`, () => {
            const form = new Dendriform(100, {history: 100});

            form.set(200);

            expect(form.value).toBe(200);
            expect(form.core.state.historyStack.length).toBe(1);

            form.replace();
            form.set(300);

            expect(form.value).toBe(300);
            expect(form.core.state.historyStack.length).toBe(1);

            form.set(400);

            expect(form.value).toBe(400);
            expect(form.core.state.historyStack.length).toBe(2);

            form.undo();

            expect(form.value).toBe(300);

            form.undo();

            expect(form.value).toBe(100);

            form.redo();

            expect(form.value).toBe(300);
        });

        test(`buffer() should mark the end of a history item`, () => {
            const form = new Dendriform(100, {history: 100});

            form.set(200);
            form.buffer();
            form.set(300);
            form.buffer();
            form.set(400);
            form.done();

            expect(form.value).toBe(400);
            expect(form.core.state.historyStack.length).toBe(3);

            form.undo();

            expect(form.value).toBe(300);

            form.undo();

            expect(form.value).toBe(200);

            form.undo();

            expect(form.value).toBe(100);
        });

        test(`buffer() should reset replace()`, () => {
            const form = new Dendriform(100, {history: 100});

            form.replace();
            form.set(200);
            form.buffer();
            form.set(300);
            form.done();

            expect(form.value).toBe(300);
            expect(form.core.state.historyStack.length).toBe(1);

            form.undo();

            expect(form.value).toBe(200);
        });

        describe('useHistory()', () => {
            test(`should provide history state`, () => {

                const firstHook = renderHook(() => useDendriform(123, {history: 100}));

                const form = firstHook.result.current;
                const {result} = renderHook(() => form.useHistory());
                expect(result.current).toEqual({
                    canUndo: false,
                    canRedo: false
                });

                act(() => {
                    form.set(456);
                });

                const result2 = result.current;

                expect(result.current).toEqual({
                    canUndo: true,
                    canRedo: false
                });

                act(() => {
                    form.set(789);
                });

                expect(result.current).toEqual({
                    canUndo: true,
                    canRedo: false
                });

                // should be exactly the same
                expect(result.current).toBe(result2);

                act(() => {
                    form.undo();
                });

                expect(result.current).toEqual({
                    canUndo: true,
                    canRedo: true
                });

                act(() => {
                    form.undo();
                });

                expect(result.current).toEqual({
                    canUndo: false,
                    canRedo: true
                });
            });
        });

        test(`should prove that empty set()'s work, by watching undo stack behaviour`, () => {
            const form = new Dendriform(123, {history: 100});

            form.set(456);
            // form.core.flush();
            form.set(noChange);
            // form.core.flush();

            expect(form.value).toBe(456);

            form.undo();
            // form.core.flush();

            expect(form.value).toBe(456);

            form.undo();
            // form.core.flush();

            expect(form.value).toBe(123);
        });
    });

    describe('useDendriform() and prop changes', () => {
        test(`should update in response to prop changes`, () => {

            let foo = 0;
            let bar = 0;

            const hook = renderHook(() => useDendriform(() => `${foo}-${bar}`, {dependencies: [foo, bar], history: 5}));

            expect(hook.result.current.value).toBe('0-0');
            expect(hook.result.current.history.canUndo).toBe(false);

            foo++;
            hook.rerender();

            expect(hook.result.current.value).toBe('1-0');
            expect(hook.result.current.history.canUndo).toBe(false);

            bar++;
            hook.rerender();

            expect(hook.result.current.value).toBe('1-1');
            expect(hook.result.current.history.canUndo).toBe(false);

            act(() => {
                hook.result.current.set('???');
            });

            expect(hook.result.current.value).toBe('???');
            expect(hook.result.current.history.canUndo).toBe(true);

            bar++;
            hook.rerender();

            expect(hook.result.current.value).toBe('1-2');
            expect(hook.result.current.history.canUndo).toBe(true);

        });
    });

    describe(`branchable`, () => {
        test(`should determine if branchable`, () => {
            expect(new Dendriform(123).branchable).toBe(false);
            expect(new Dendriform('abc').branchable).toBe(false);
            expect(new Dendriform(true).branchable).toBe(false);
            expect(new Dendriform(undefined).branchable).toBe(false);
            expect(new Dendriform(null).branchable).toBe(false);
            expect(new Dendriform({foo: true}).branchable).toBe(true);
            expect(new Dendriform([1,2,3]).branchable).toBe(true);
            expect(new Dendriform(new Map()).branchable).toBe(true);
            expect(new Dendriform(new Set()).branchable).toBe(true);
            expect(new Dendriform(new Date()).branchable).toBe(true);
        });
    });

    describe(`.branch()`, () => {

        test(`should get child value`, () => {
            const form = new Dendriform(['A','B','C']);

            const bForm = form.branch(1);
            expect(bForm.value).toBe('B');
            expect(bForm.id).toBe('1');

            const cForm = form.branch(2);
            expect(cForm.value).toBe('C');
            expect(cForm.id).toBe('2');

            const bFormAgain = form.branch(1);
            expect(bFormAgain.value).toBe('B');
            expect(bFormAgain.id).toBe('1');
        });

        test(`should produce child value with new value`, () => {
            const form = new Dendriform(['A','B','C']);

            const secondElement = form.branch(1);
            const nodesBefore = form.core.state.nodes;
            secondElement.set('B!');

            expect(form.value).toEqual(['A','B!','C']);
            expect(form.core.state.nodes).toEqual(nodesBefore);
        });

        test(`should produce non-immerable child value with new value`, () => {
            const d = new Date();
            const d2 = new Date();
            const form = new Dendriform<Date[]>([d]);
            form.branch(0).set(d2);

            expect(form.value).toEqual([d2]);
        });

        test(`should produce child value with immer producer`, () => {
            const form = new Dendriform({foo: [1,2]});

            form.branch('foo').set(draft => {
                draft.unshift(0);
            });
            form.branch('foo').set(draft => {
                draft.unshift(-1);
            });

            expect(form.value).toEqual({foo: [-1,0,1,2]});
        });

        test(`should return same instance for all .branch()s to same child`, () => {
            const form = new Dendriform(['A','B','C']);

            expect(form.branch(1)).toBe(form.branch(1));
        });

        describe('not set values', () => {
            test(`should get child value`, () => {
                const form = new Dendriform<NotSetTestValue>({foo: 'a'});

                form.branch('foo');
                const bForm = form.branch('bar');

                expect(bForm.value).toBe(undefined);
                expect(bForm.id).toBe('2');
            });

            test(`should produce child value with new value`, () => {
                const form = new Dendriform<NotSetTestValue>({foo: 'a'});

                const bForm = form.branch('bar');
                const nodesBefore = form.core.state.nodes;
                bForm.set('B!');

                expect(form.value).toEqual({foo: 'a', bar: 'B!'});
                expect(form.core.state.nodes).toEqual(nodesBefore);
            });
        });

        test(`should produce parent value with setParent`, () => {
            const form = new Dendriform(['A','B','C']);

            const update = jest.fn((_key) => ['X']);

            form.branch(2).setParent(update);

            expect(update).toHaveBeenCalledTimes(1);
            expect(update.mock.calls[0][0]).toBe(2);
            expect(form.value).toEqual(['X']);
        });

        test(`should update node type when switching a child to a parent`, () => {
            const form = new Dendriform<any>({foo: true});

            expect(form.branch('foo').value).toBe(true);

            form.set({foo: {bar: true}});

            expect(form.value).toEqual({foo: {bar: true}});
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            expect(form.branch('foo').branch('bar').value).toBe(true);
        });

        test(`should get child value of es6 map`, () => {
            const form = new Dendriform(new Map([['a','A'],['b','B'],['c','C']]));

            const bForm = form.branch('a');
            expect(bForm.value).toBe('A');
            expect(bForm.id).toBe('1');
        });

        test(`should set child value of es6 map`, () => {
            const form = new Dendriform(new Map([['a','A'],['b','B'],['c','C']]));

            form.branch('a').set('!');
            expect(form.value.get('a')).toBe('!');
        });

        test(`should get child value of es6 set`, () => {
           const form = new Dendriform<Set<number>>(new Set([0,2]));

           const bForm = form.branch(0);
           expect(bForm.value).toBe(0);

           const cForm = form.branch(1);
           expect(cForm.value).toBe(undefined);
        });

        test(`should error when trying to set child value of es6 set`, () => {
           const form = new Dendriform<Set<number>[]>([new Set([0,2])]);

           expect(() => form.branch(0).branch(0).set(3)).toThrow('Cannot call .set() on an element of an es6 Set');
        });

        test(`should set value of es6 set from parent`, () => {
           const form = new Dendriform<Set<number>>(new Set([0,2]));

           form.set(draft => {
               draft.delete(0);
           });
           expect(Array.from(form.value.values())).toEqual([2]);
        });
    });

    describe(`.branch() deep`, () => {

        test(`should get child value`, () => {
            const form = new Dendriform({
                foo: {
                    bar: 123
                }
            });

            const barForm = form.branch(['foo','bar']);

            expect(barForm.value).toBe(123);
            expect(barForm.id).toBe('2');
        });

        test(`should produce child value with new value`, () => {
            const form = new Dendriform({
                foo: {
                    bar: 123
                }
            });

            form.branch(['foo','bar']).set(456);

            expect(form.value).toEqual({
                foo: {
                    bar: 456
                }
            });
        });

        test(`should get impossible child value`, () => {
            const form = new Dendriform(123);

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            const barForm = form.branch(['foo','bar']);

            expect(barForm.value).toBe(undefined);
            expect(barForm.id).toBe('notfound');
        });

        test(`should get deleted child value`, () => {
            const form = new Dendriform([[[123]]]);
            const elemForm = form.branch([0,0]);
            expect(elemForm.id).toBe('2');

            // delete nodes because data in arrays are not considered
            // equivalent based on index, so deep nodes are deleted
            form.set([[[123]]]);

            expect(elemForm.branch(0).value).toBe(undefined);
            expect(form.branch([0,0,0]).value).toBe(123);
        });
    });

    describe(`.branchAll()`, () => {

        test(`should branchAll() no levels`, () => {
            const form = new Dendriform(['A','B','C']);
            const forms = form.branchAll();

            expect(forms.map(f => f.value)).toEqual(['A','B','C']);
            expect(forms.map(f => f.id)).toEqual(['1','2','3']);
        });

        test(`should branchAll() no levels (using [])`, () => {
            const form = new Dendriform(['A','B','C']);
            const forms = form.branchAll([]);

            expect(forms.map(f => f.value)).toEqual(['A','B','C']);
            expect(forms.map(f => f.id)).toEqual(['1','2','3']);
        });

        test(`should branchAll() one level with key`, () => {
            const form = new Dendriform({foo: ['A','B','C']});
            const forms = form.branchAll('foo');

            expect(forms.map(f => f.value)).toEqual(['A','B','C']);
            expect(forms.map(f => f.id)).toEqual(['2','3','4']);
        });

        test(`should branchAll() one level with path`, () => {
            const form = new Dendriform({foo: ['A','B','C']});
            const forms = form.branchAll(['foo']);

            expect(forms.map(f => f.value)).toEqual(['A','B','C']);
            expect(forms.map(f => f.id)).toEqual(['2','3','4']);
        });

        test(`should branchAll() two levels with path`, () => {
            const form = new Dendriform({
                foo: {
                    bar: ['A','B','C']
                }
            });

            const forms = form.branchAll(['foo', 'bar']);

            expect(forms.map(f => f.value)).toEqual(['A','B','C']);
            expect(forms.map(f => f.id)).toEqual(['3','4','5']);
        });

        test(`should produce child value with new value`, () => {
            const form = new Dendriform(['A','B','C']);

            const forms = form.branchAll();
            const nodesBefore = form.core.state.nodes;
            forms[1].set('B!');

            expect(form.value).toEqual(['A','B!','C']);
            expect(form.core.state.nodes).toEqual(nodesBefore);
        });

        test(`should return same instance for all .branchAll()s to same child`, () => {
            const form = new Dendriform(['A','B','C']);

            expect(form.branchAll()).toEqual(form.branchAll());
        });

        test(`should work with es6 Map`, () => {
            const form = new Dendriform(new Map([['a','A'],['b','B'],['c','C']]));
            const forms = form.branchAll();

            expect(forms.map(f => f.value)).toEqual(['A','B','C']);
        });

        test(`should work with es6 set`, () => {
            const form = new Dendriform(new Set([0,1]));
            const forms = form.branchAll();

            expect(forms.map(f => f.value)).toEqual([0,1]);
        });

        test(`should error if getting a basic type`, () => {
            const form = new Dendriform(123);

            expect(() => form.branchAll()).toThrow('branchAll() can only be called on forms containing an array, object, es6 map or es6 set');
        });

        // TODO what about misses?
    });

    describe(`es6 values`, () => {

        describe(`es6 class`, () => {

            test(`should allow branching of plain ES6 class, but not setting`, () => {
                expect.assertions(3);

                class MyClass {
                    hello = "hi";
                }

                const instance = new MyClass();

                const form = new Dendriform(instance);
                expect(form.value).toBe(instance);
                expect(form.branch('hello').value).toBe("hi");

                expect(() => form.branch('hello').set('bye')).toThrow('produce can only be called on things that are draftable');
            });

            test(`should allow branching and setting if class is immerable`, () => {

                class MyClass {
                    hello = "hi";
                    [immerable] = true;
                }

                const instance = new MyClass();

                const form = new Dendriform(instance);
                expect(form.value).toBe(instance);
                expect(form.branch('hello').value).toBe("hi");

                form.branch('hello').set('bye');
                expect(form.value).toEqual({
                    hello: 'bye',
                    [immerable]: true
                });
            });

        });

        describe(`es6 Map`, () => {

            test(`should allow branching and setting of ES6 Map`, () => {

                const form = new Dendriform(new Map<string,number>([
                    ['one', 1],
                    ['two', 2]
                ]));

                expect(form.branch('one').value).toBe(1);

                form.branch('one').set(3);
                expect(form.value.get('one')).toBe(3);
                expect(form.value.get('two')).toBe(2);
            });

            test(`should allow branching and setting of ES6 Map with numeric keys`, () => {

                const form = new Dendriform(new Map<number,string>([
                    [1, 'one'],
                    [2, 'two']
                ]));

                expect(form.branch(1).value).toBe('one');

                form.branch(1).set('one!');
                expect(form.value.get(1)).toBe('one!');
                expect(form.value.get(2)).toBe('two');
            });

        });

    });

    describe(`.render()`, () => {

        describe(`rendering`, () => {

            test(`should render no levels and return React element`, () => {
                const form = new Dendriform(['A','B','C']);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.render(renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(1);
                expect(renderer.mock.calls[0][0]).toBe(form);
                expect(renderer.mock.calls[0][0].value).toBe(form.value);
                expect(wrapper.find('.branch').length).toBe(1);
            });

            test(`should render no levels (using []) and return React element`, () => {
                const form = new Dendriform(['A','B','C']);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.render([], renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(1);
                expect(renderer.mock.calls[0][0].value).toBe(form.value);
                expect(wrapper.find('.branch').length).toBe(1);
            });

            test(`should render one level and return React element`, () => {
                const form = new Dendriform(['A','B','C']);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.render(1, renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(1);
                expect(renderer.mock.calls[0][0]).toBe(form.branch(1));
                expect(renderer.mock.calls[0][0].value).toBe(form.branch(1).value);
                expect(wrapper.find('.branch').length).toBe(1);
            });

            test(`should render multiple levels and return React element`, () => {
                const form = new Dendriform([[['A','B']]]);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[][][]>) => {
                    return props.form.render([0,0,1], renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(1);
                expect(renderer.mock.calls[0][0]).toBe(form.branch([0,0,1]));
                expect(renderer.mock.calls[0][0].value).toBe(form.branch([0,0,1]).value);
                expect(wrapper.find('.branch').length).toBe(1);
            });
        });

        describe(`react memo and deps`, () => {

            test(`should not re-render when unrelated props changes`, () => {
                const form = new Dendriform(['A','B','C']);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.render(1, renderer);
                };

                const wrapper = mount(<MyComponent foo={1} form={form} />);

                expect(renderer).toHaveBeenCalledTimes(1);

                // should not update if unrelated props change
                wrapper.setProps({foo: 2, form});
                expect(renderer).toHaveBeenCalledTimes(1);
            });

            test(`should render no levels with deps`, () => {
                const form = new Dendriform(['A','B','C']);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.render(renderer, [props.foo]);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} bar={1} />);

                expect(renderer).toHaveBeenCalledTimes(1);

                // should not update if unrelated props change
                wrapper.setProps({foo: 1, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(1);

                // should update if deps change
                wrapper.setProps({foo: 2, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(2);
            });

            test(`should render no levels (using []) with deps`, () => {
                const form = new Dendriform(['A','B','C']);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.render([], renderer, [props.foo]);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} bar={1} />);

                expect(renderer).toHaveBeenCalledTimes(1);

                // should not update if unrelated props change
                wrapper.setProps({foo: 1, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(1);

                // should update if deps change
                wrapper.setProps({foo: 2, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(2);
            });

            test(`should render one level with deps`, () => {
                const form = new Dendriform(['A','B','C']);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.render(1, renderer, [props.foo]);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} bar={1} />);

                expect(renderer).toHaveBeenCalledTimes(1);

                // should not update if unrelated props change
                wrapper.setProps({foo: 1, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(1);

                // should update if deps change
                wrapper.setProps({foo: 2, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(2);
            });

            test(`should render one level with changing form`, () => {
                const form = new Dendriform(['A','B','C']);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentIndexProps<string[]>) => {
                    return props.form.render(props.index, renderer, [props.foo]);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} bar={1} index={0} />);

                expect(renderer).toHaveBeenCalledTimes(1);

                // should update if base form change
                wrapper.setProps({foo: 1, bar: 1, form, index: 1});
                expect(renderer).toHaveBeenCalledTimes(2);
            });

            test(`should render multiple levels with deps`, () => {
                const form = new Dendriform([[['A','B']]]);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[][][]>) => {
                    return props.form.render([0,0,1], renderer, [props.foo]);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} bar={1} />);

                expect(renderer).toHaveBeenCalledTimes(1);

                // should not update if unrelated props change
                wrapper.setProps({foo: 1, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(1);

                // should update if deps change
                wrapper.setProps({foo: 2, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe(`.renderAll()`, () => {

        describe(`rendering`, () => {

            test(`should error if rendering a basic type`, () => {
                const consoleError = console.error;
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                console.error = () => {};

                const form = new Dendriform('4');

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string>) => {
                    return props.form.renderAll(renderer);
                };

                expect(() => mount(<MyComponent form={form} foo={1} />)).toThrow('renderAll() can only be called on forms containing an array, object, es6 map or es6 set');

                console.error = consoleError;
            });

            test(`should renderAll no levels and return React element`, () => {
                const form = new Dendriform(['A','B','C']);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.renderAll(renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(3);
                expect(renderer.mock.calls[0][0].value).toBe(form.branch(0).value);
                expect(renderer.mock.calls[1][0].value).toBe(form.branch(1).value);
                expect(renderer.mock.calls[2][0].value).toBe(form.branch(2).value);
                expect(wrapper.find('.branch').length).toBe(3);
            });

            test(`should renderAll no levels (using []) and return React element`, () => {
                const form = new Dendriform(['A','B','C']);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.renderAll([], renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(3);
                expect(renderer.mock.calls[0][0].value).toBe(form.branch(0).value);
                expect(renderer.mock.calls[1][0].value).toBe(form.branch(1).value);
                expect(renderer.mock.calls[2][0].value).toBe(form.branch(2).value);
                expect(wrapper.find('.branch').length).toBe(3);
            });

            test(`should renderAll one level and return React element`, () => {
                const form = new Dendriform({foo: ['A','B','C']});

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<{foo: string[]}>) => {
                    return props.form.renderAll('foo', renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(3);
                expect(renderer.mock.calls[0][0].value).toBe(form.branch(['foo', 0]).value);
                expect(renderer.mock.calls[1][0].value).toBe(form.branch(['foo', 1]).value);
                expect(renderer.mock.calls[2][0].value).toBe(form.branch(['foo', 2]).value);
                expect(wrapper.find('.branch').length).toBe(3);
            });

            test(`should renderAll multiple levels and return React element`, () => {
                const form = new Dendriform([[['A','B']]]);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[][][]>) => {
                    return props.form.renderAll([0,0], renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(2);
                expect(renderer.mock.calls[0][0].value).toBe(form.branch([0,0,0]).value);
                expect(renderer.mock.calls[1][0].value).toBe(form.branch([0,0,1]).value);
                expect(wrapper.find('.branch').length).toBe(2);
            });

            test(`should renderAll es6 map return React element`, () => {
                const form = new Dendriform(new Map([['foo',1],['bar',2]]));

                const renderer = jest.fn();

                const MyComponent = (props: MyComponentProps<Map<string,number>>) => {
                    return props.form.renderAll(form => {
                        renderer(form);
                        const num: number = form.value;
                        return <div className="branch">{num}</div>;
                    });
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(2);
                expect(renderer.mock.calls[0][0].value).toBe(form.branch('foo').value);
                expect(renderer.mock.calls[1][0].value).toBe(form.branch('bar').value);
                expect(wrapper.find('.branch').length).toBe(2);
            });

            test(`should renderAll object return React element`, () => {
                const form = new Dendriform<{[key: string]: number}>({foo: 1, bar: 2});

                const renderer = jest.fn();

                const MyComponent = (props: MyComponentProps<{[key: string]: number}>) => {
                    return props.form.renderAll(form => {
                        renderer(form);
                        const num: number = form.value;
                        return <div className="branch">{num}</div>;
                    });
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(2);
                expect(renderer.mock.calls[0][0].value).toBe(form.branch('foo').value);
                expect(renderer.mock.calls[1][0].value).toBe(form.branch('bar').value);
                expect(wrapper.find('.branch').length).toBe(2);
            });

            test(`should renderAll es6 set return React element`, () => {
                const form = new Dendriform<Set<string>>(new Set(['foo','bar']));

                const renderer = jest.fn();

                const MyComponent = (props: MyComponentProps<Set<string>>) => {
                    return props.form.renderAll(form => {
                        renderer(form);
                        const num: string = form.value;
                        return <div className="branch">{num}</div>;
                    });
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(2);
                expect(renderer.mock.calls[0][0].value).toBe(form.branch('foo').value);
                expect(renderer.mock.calls[1][0].value).toBe(form.branch('bar').value);
                expect(wrapper.find('.branch').length).toBe(2);
            });
        });

        describe(`react memo and deps`, () => {

            test(`should not re-render when unrelated props changes`, () => {
                const form = new Dendriform(['A','B','C']);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.renderAll(renderer);
                };

                const wrapper = mount(<MyComponent foo={1} form={form} />);

                expect(renderer).toHaveBeenCalledTimes(3);

                // should not update if unrelated props change
                wrapper.setProps({foo: 2, form});
                expect(renderer).toHaveBeenCalledTimes(3);
            });

            test(`should renderAll no levels with deps`, () => {
                const form = new Dendriform(['A','B','C']);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.renderAll(renderer, [props.foo]);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} bar={1} />);

                expect(renderer).toHaveBeenCalledTimes(3);

                // should not update if unrelated props change
                wrapper.setProps({foo: 1, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(3);

                // should update if deps change
                wrapper.setProps({foo: 2, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(6);
            });

            test(`should renderAll no levels (using []) with deps`, () => {
                const form = new Dendriform(['A','B','C']);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.renderAll([], renderer, [props.foo]);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} bar={1} />);

                expect(renderer).toHaveBeenCalledTimes(3);

                // should not update if unrelated props change
                wrapper.setProps({foo: 1, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(3);

                // should update if deps change
                wrapper.setProps({foo: 2, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(6);
            });

            test(`should renderAll one level with deps`, () => {
                const form = new Dendriform({foo: ['A','B','C']});

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<{foo: string[]}>) => {
                    return props.form.renderAll('foo', renderer, [props.foo]);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} bar={1} />);

                expect(renderer).toHaveBeenCalledTimes(3);

                // should not update if unrelated props change
                wrapper.setProps({foo: 1, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(3);

                // should update if deps change
                wrapper.setProps({foo: 2, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(6);
            });

            test(`should renderAll multiple levels with deps`, () => {
                const form = new Dendriform([[['A','B']]]);

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[][][]>) => {
                    return props.form.renderAll([0,0], renderer, [props.foo]);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} bar={1} />);

                expect(renderer).toHaveBeenCalledTimes(2);

                // should not update if unrelated props change
                wrapper.setProps({foo: 1, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(2);

                // should update if deps change
                wrapper.setProps({foo: 2, bar: 2, form});
                expect(renderer).toHaveBeenCalledTimes(4);
            });
        });
    });

    describe(`onChange`, () => {

        test(`should be called when value changes`, () => {
            const callback = jest.fn();
            const form = new Dendriform(123);
            const cancel = form.onChange(callback);

            // should be called on change
            form.set(456);

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0]).toBe(456);
            expect(callback.mock.calls[0][1].patches.do.value).toEqual([
                {op: 'replace', path: [], value: 456}
            ]);
            expect(callback.mock.calls[0][1].prev).toEqual({
                value: 123,
                nodes: {
                    '0': {
                        child: undefined,
                        id: '0',
                        parentId: '',
                        type: 0
                    }
                }
            });
            expect(callback.mock.calls[0][1].next).toEqual({
                value: 456,
                nodes: {
                    '0': {
                        child: undefined,
                        id: '0',
                        parentId: '',
                        type: 0
                    }
                }
            });

            // should not be called if value is the same
            form.set(456);

            expect(callback).toHaveBeenCalledTimes(1);

            // should be called if value changes again
            form.set(457);

            expect(callback).toHaveBeenCalledTimes(2);
            expect(callback.mock.calls[1][0]).toBe(457);
            expect(callback.mock.calls[1][1].prev).toEqual({
                value: 456,
                nodes: {
                    '0': {
                        child: undefined,
                        id: '0',
                        parentId: '',
                        type: 0
                    }
                }
            });
            expect(callback.mock.calls[1][1].next).toEqual({
                value: 457,
                nodes: {
                    '0': {
                        child: undefined,
                        id: '0',
                        parentId: '',
                        type: 0
                    }
                }
            });

            // should not be called once cancel is called
            cancel();
            form.set(458);

            expect(callback).toHaveBeenCalledTimes(2);
        });

        test(`should be called when value is undone`, () => {
            const callback = jest.fn();
            const form = new Dendriform(123, {history: 100});
            form.onChange(callback);

            form.set(456);

            form.undo();

            expect(callback).toHaveBeenCalledTimes(2);
            expect(callback.mock.calls[1][0]).toBe(123);
            expect(callback.mock.calls[1][1].patches.do.value).toEqual([
                {op: 'replace', path: [], value: 123}
            ]);
        });

        test(`should still contain all patches even if not called after each set / undo`, () => {
            const callback = jest.fn();
            const form = new Dendriform(123, {history: 100});
            form.onChange(callback);

            form.buffer();
            form.set(456);
            form.buffer();
            form.set(789);
            form.buffer();
            form.undo();
            form.done();

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0]).toBe(456);
            expect(callback.mock.calls[0][1].patches.do.value).toEqual([
                {op: 'replace', path: [], value: 456},
                {op: 'replace', path: [], value: 789},
                {op: 'replace', path: [], value: 456}
            ]);
        });

    });

    describe(`onChangeIndex`, () => {

        test.only(`should be called when index changes`, () => {
            const callback = jest.fn();
            const form = new Dendriform(['a','b','c','d']);
            form.branch(3).onChangeIndex(callback);

            console.log('f', form.core.state.nodes);

            // should be called on change of index
            form.set(draft => {
                draft.unshift('?');
            });

            console.log('form', form.value);

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0]).toBe(2);
        });

    });

    describe(`derive`, () => {

        test(`should allow derivers to be added and cancelled`, () => {

            const form = new Dendriform({
                name: 'boo',
                letters: 0
            });

            const changer = jest.fn((_value, _details) => {});
            form.onChange(changer);

            const deriver = jest.fn((value, _details) => {
                form.branch('letters').set(value.name.length);
            });

            const cancel = form.onDerive(deriver);

            expect(deriver).toHaveBeenCalledTimes(1);
            expect(deriver.mock.calls[0][0]).toEqual({
                name: 'boo',
                letters: 0
            });
            expect(deriver.mock.calls[0][1]).toEqual({
                go: 0,
                id: '0',
                patches: {
                    do: {nodes: [], value: []},
                    undo: {nodes: [], value: []}
                },
                replace: true,
                force: false,
                prev: {
                    nodes: undefined,
                    value: undefined
                },
                next: {
                    nodes: {
                        '0': {
                            child: {},
                            id: '0',
                            parentId: '',
                            type: 1
                        }
                    },
                    value: {
                        name: 'boo',
                        letters: 0
                    }
                }
            });

            expect(changer).toHaveBeenCalledTimes(1);
            expect(changer.mock.calls[0][0]).toEqual({
                name: 'boo',
                letters: 3
            });
            expect(changer.mock.calls[0][1].patches.do.value).toEqual([
                {
                    op: 'replace',
                    path: ['letters'],
                    value: 3
                }
            ]);

            //
            // make a change
            //

            form.branch('name').set('boooo');

            expect(deriver).toHaveBeenCalledTimes(2);
            expect(deriver.mock.calls[1][0]).toEqual({
                name: 'boooo',
                letters: 3
            });
            expect(deriver.mock.calls[1][1].go).toBe(0);
            expect(deriver.mock.calls[1][1].replace).toBe(false);
            expect(deriver.mock.calls[1][1].patches.do.value).toEqual([
                {
                    op: 'replace',
                    path: ['name'],
                    value: 'boooo'
                }
            ]);

            expect(changer).toHaveBeenCalledTimes(2);
            expect(changer.mock.calls[1][0]).toEqual({
                name: 'boooo',
                letters: 5
            });
            expect(changer.mock.calls[1][1].patches.do.value).toEqual([
                {
                    op: 'replace',
                    path: ['name'],
                    value: 'boooo'
                },
                {
                    op: 'replace',
                    path: ['letters'],
                    value: 5
                }
            ]);

            //
            // cancel the derive and make another change
            //

            cancel();
            form.branch('name').set('boooooo');

            expect(deriver).toHaveBeenCalledTimes(2);

            expect(changer).toHaveBeenCalledTimes(3);
            expect(changer.mock.calls[2][0]).toEqual({
                name: 'boooooo',
                letters: 5 // <- this should still be 5 because the deriver is cancelled
            });

        });

        test(`should handle multiple derivers on same form, calling them sequentially`, () => {

            const form = new Dendriform({
                name: 'boo',
                letters: 0,
                lettersDoubled: 0
            });

            const deriver1 = jest.fn((value, _details) => {
                form.branch('letters').set(value.name.length);
            });

            const deriver2 = jest.fn((value, _details) => {
                form.branch('lettersDoubled').set(value.letters * 2);
            });

            //
            // add deriver 1
            //

            form.onDerive(deriver1);

            expect(deriver1).toHaveBeenCalledTimes(1);
            expect(deriver1.mock.calls[0][0]).toEqual({
                name: 'boo',
                letters: 0,
                lettersDoubled: 0
            });
            expect(deriver1.mock.calls[0][1]).toEqual({
                go: 0,
                id: '0',
                patches: {
                    do: {nodes: [], value: []},
                    undo: {nodes: [], value: []}
                },
                replace: true,
                force: false,
                prev: {
                    nodes: undefined,
                    value: undefined
                },
                next: {
                    nodes: {
                        '0': {
                            child: {},
                            id: '0',
                            parentId: '',
                            type: 1
                        }
                    },
                    value: {
                        name: 'boo',
                        letters: 0,
                        lettersDoubled: 0
                    }
                }
            });
            expect(form.value).toEqual({
                name: 'boo',
                letters: 3,
                lettersDoubled: 0
            });

            //
            // add deriver 2
            //

            form.onDerive(deriver2);

            expect(deriver2).toHaveBeenCalledTimes(1);
            expect(deriver2.mock.calls[0][0]).toEqual({
                name: 'boo',
                letters: 3,
                lettersDoubled: 0
            });
            expect(deriver2.mock.calls[0][1]).toEqual({
                go: 0,
                id: '0',
                patches: {
                    do: {nodes: [], value: []},
                    undo: {nodes: [], value: []}
                },
                replace: true,
                force: false,
                prev: {
                    nodes: undefined,
                    value: undefined
                },
                next: {
                    nodes: {
                        '0': {
                            child: {
                                letters: '1'
                            },
                            id: '0',
                            parentId: '',
                            type: 1
                        },
                        '1': {
                            child: undefined,
                            id: '1',
                            parentId: '0',
                            type: 0
                        }
                    },
                    value: {
                        name: 'boo',
                        letters: 3,
                        lettersDoubled: 0
                    }
                }
            });
            expect(form.value).toEqual({
                name: 'boo',
                letters: 3,
                lettersDoubled: 6
            });

            //
            // add changer and make a change
            //

            const changer = jest.fn((_value, _details) => {});
            form.onChange(changer);

            form.branch('name').set('boooo');

            expect(deriver1).toHaveBeenCalledTimes(2);
            expect(deriver1.mock.calls[1][0]).toEqual({
                name: 'boooo',
                letters: 3,
                lettersDoubled: 6
            });
            expect(deriver1.mock.calls[1][1].go).toBe(0);
            expect(deriver1.mock.calls[1][1].replace).toBe(false);
            expect(deriver1.mock.calls[1][1].patches.do.value).toEqual([
                {
                    op: 'replace',
                    path: ['name'],
                    value: 'boooo'
                }
            ]);

            expect(deriver2).toHaveBeenCalledTimes(2);
            expect(deriver2.mock.calls[1][0]).toEqual({
                name: 'boooo',
                letters: 5,
                lettersDoubled: 6
            });
            expect(deriver2.mock.calls[1][1].go).toBe(0);
            expect(deriver2.mock.calls[1][1].replace).toBe(false);
            expect(deriver2.mock.calls[1][1].patches.do.value).toEqual([
                {
                    op: 'replace',
                    path: ['name'],
                    value: 'boooo'
                },
                {
                    op: 'replace',
                    path: ['letters'],
                    value: 5
                }
            ]);

            expect(changer).toHaveBeenCalledTimes(1);
            expect(changer.mock.calls[0][0]).toEqual({
                name: 'boooo',
                letters: 5,
                lettersDoubled: 10
            });
            expect(changer.mock.calls[0][1].patches.do.value).toEqual([
                {
                    op: 'replace',
                    path: ['name'],
                    value: 'boooo'
                },
                {
                    op: 'replace',
                    path: ['letters'],
                    value: 5
                },
                {
                    op: 'replace',
                    path: ['lettersDoubled'],
                    value: 10
                }
            ]);

        });


        test(`should undo and redo`, () => {

            const form = new Dendriform({
                name: 'boo',
                letters: 0
            }, {history: 1000});

            const deriver = jest.fn((value, _details) => {
                form.branch('letters').set(value.name.length);
            });
            form.onDerive(deriver);

            const changer = jest.fn();
            form.onChange(changer);

            //
            // set value
            //

            form.branch('name').set('boooo');

            expect(form.core.state.historyStack.length).toBe(1);
            expect(form.core.state.historyIndex).toBe(1);

            expect(deriver).toHaveBeenCalledTimes(2);
            expect(deriver.mock.calls[1][0]).toEqual({
                name: 'boooo',
                letters: 3
            });
            expect(deriver.mock.calls[1][1].go).toBe(0);
            expect(deriver.mock.calls[1][1].replace).toBe(false);
            expect(deriver.mock.calls[1][1].patches.do.value).toEqual([
                {
                    op: 'replace',
                    path: ['name'],
                    value: 'boooo'
                }
            ]);

            expect(changer).toHaveBeenCalledTimes(1);
            expect(changer.mock.calls[0][0]).toEqual({
                name: 'boooo',
                letters: 5
            });

            //
            // undo
            //

            form.undo();

            expect(form.core.state.historyStack.length).toBe(1);
            expect(form.core.state.historyIndex).toBe(0);

            expect(deriver).toHaveBeenCalledTimes(3);
            expect(deriver.mock.calls[2][0]).toEqual({
                name: 'boo',
                letters: 5 // <---- note that derived patches are not included in history,
                //                  so are not undone.
                //                  the assumption is they will continue to be derived
            });

            expect(deriver.mock.calls[2][1].go).toBe(-1);
            expect(deriver.mock.calls[2][1].replace).toBe(false);
            expect(deriver.mock.calls[2][1].patches.do.value).toEqual([
                {
                    op: 'replace',
                    path: ['name'],
                    value: 'boo'
                }
            ]);

            expect(changer).toHaveBeenCalledTimes(2);
            expect(changer.mock.calls[1][0]).toEqual({
                name: 'boo',
                letters: 3
            });

            //
            // redo
            //

            form.redo();

            expect(form.core.state.historyStack.length).toBe(1);
            expect(form.core.state.historyIndex).toBe(1);

            expect(deriver).toHaveBeenCalledTimes(4);
            expect(deriver.mock.calls[3][0]).toEqual({
                name: 'boooo',
                letters: 3 // <---- note that derived patches are not included in history,
                //                  so are not undone.
                //                  the assumption is they will continue to be derived
            });

            expect(deriver.mock.calls[3][1].go).toBe(1);
            expect(deriver.mock.calls[3][1].replace).toBe(false);
            expect(deriver.mock.calls[3][1].patches.do.value).toEqual([
                {
                    op: 'replace',
                    path: ['name'],
                    value: 'boooo'
                }
            ]);

            expect(changer).toHaveBeenCalledTimes(3);
            expect(changer.mock.calls[2][0]).toEqual({
                name: 'boooo',
                letters: 5
            });
        });

        test(`should undo and redo with replace`, () => {

            const form = new Dendriform({
                name: 'boo',
                letters: 0
            }, {history: 1000});

            const deriver = jest.fn((value, _details) => {
                form.branch('letters').set(value.name.length);
            });
            form.onDerive(deriver);

            const changer = jest.fn();
            form.onChange(changer);

            //
            // set value
            //

            form.branch('name').set('boooo');

            expect(form.core.state.historyStack.length).toBe(1);
            expect(form.core.state.historyIndex).toBe(1);

            expect(deriver).toHaveBeenCalledTimes(2);
            expect(deriver.mock.calls[1][0]).toEqual({
                name: 'boooo',
                letters: 3
            });
            expect(deriver.mock.calls[1][1].go).toBe(0);
            expect(deriver.mock.calls[1][1].replace).toBe(false);
            expect(deriver.mock.calls[1][1].patches.do.value).toEqual([
                {
                    op: 'replace',
                    path: ['name'],
                    value: 'boooo'
                }
            ]);

            expect(changer).toHaveBeenCalledTimes(1);
            expect(changer.mock.calls[0][0]).toEqual({
                name: 'boooo',
                letters: 5
            });

            //
            // replace value
            //

            form.replace();
            form.branch('name').set('!!!!!!!');

            expect(form.core.state.historyStack.length).toBe(1);
            expect(form.core.state.historyIndex).toBe(1);

            expect(deriver).toHaveBeenCalledTimes(3);
            expect(deriver.mock.calls[2][0]).toEqual({
                name: '!!!!!!!',
                letters: 5
            });
            expect(deriver.mock.calls[2][1].go).toBe(0);
            expect(deriver.mock.calls[2][1].replace).toBe(true);
            expect(deriver.mock.calls[2][1].patches.do.value).toEqual([
                {
                    op: 'replace',
                    path: ['name'],
                    value: '!!!!!!!'
                }
            ]);

            expect(changer).toHaveBeenCalledTimes(2);
            expect(changer.mock.calls[1][0]).toEqual({
                name: '!!!!!!!',
                letters: 7
            });

            //
            // undo
            //

            form.undo();

            expect(form.core.state.historyStack.length).toBe(1);
            expect(form.core.state.historyIndex).toBe(0);

            expect(deriver).toHaveBeenCalledTimes(4);
            expect(deriver.mock.calls[3][0]).toEqual({
                name: 'boo',
                letters: 7 // <---- note that derived patches are not included in history,
                //                  so are not undone.
                //                  the assumption is they will continue to be derived
            });

            expect(deriver.mock.calls[3][1].go).toBe(-1);
            expect(deriver.mock.calls[3][1].replace).toBe(false);
            expect(deriver.mock.calls[3][1].patches.do.value).toEqual([
                {
                    op: 'replace',
                    path: ['name'],
                    value: 'boooo'
                },
                {
                    op: 'replace',
                    path: ['name'],
                    value: 'boo'
                }
            ]);

            expect(changer).toHaveBeenCalledTimes(3);
            expect(changer.mock.calls[2][0]).toEqual({
                name: 'boo',
                letters: 3
            });

            //
            // redo
            //

            form.redo();

            expect(form.core.state.historyStack.length).toBe(1);
            expect(form.core.state.historyIndex).toBe(1);

            expect(deriver).toHaveBeenCalledTimes(5);
            expect(deriver.mock.calls[4][0]).toEqual({
                name: '!!!!!!!',
                letters: 3 // <---- note that derived patches are not included in history,
                //                  so are not undone.
                //                  the assumption is they will continue to be derived
            });

            expect(deriver.mock.calls[4][1].go).toBe(1);
            expect(deriver.mock.calls[4][1].replace).toBe(false);
            expect(deriver.mock.calls[4][1].patches.do.value).toEqual([
                {
                    op: 'replace',
                    path: ['name'],
                    value: 'boooo'
                },
                {
                    op: 'replace',
                    path: ['name'],
                    value: '!!!!!!!'
                }
            ]);

            expect(changer).toHaveBeenCalledTimes(4);
            expect(changer.mock.calls[3][0]).toEqual({
                name: '!!!!!!!',
                letters: 7
            });
        });

        describe(`derive between forms`, () => {
            test(`should undo and redo, second form is always derived`, () => {

                // could be useful for derived data such as validation

                const form = new Dendriform(100, {history: 1000});
                const form2 = new Dendriform(0);

                const changer = jest.fn();
                form.onChange(changer);

                form.onDerive((value) => {
                    form2.set(value * 2);
                });

                form.set(200);

                expect(form.value).toBe(200);
                expect(form2.value).toBe(400);

                // then undo, should re-derive

                form.undo();

                expect(form.value).toBe(100);
                expect(form2.value).toBe(200);
            });

            test(`should undo and redo, second form has its own history stack`, () => {

                // could be useful for derived data such as validation with cached results

                const form = new Dendriform(100, {history: 1000});
                const form2 = new Dendriform(0, {history: 1000});

                const changer = jest.fn();
                form.onChange(changer);

                form.onDerive((value, {go, replace}) => {
                    if(go) return form2.go(go);
                    form2.replace(replace);
                    form2.set(value * 2);
                });

                expect(form2.value).toBe(200);

                form.set(200);

                expect(form.value).toBe(200);
                expect(form2.value).toBe(400);

                // then undo, form 2 should also undo

                form.undo();

                expect(form.value).toBe(100);
                expect(form.history.canUndo).toBe(false);
                expect(form.history.canRedo).toBe(true);
                expect(form2.value).toBe(200);
                expect(form2.history.canUndo).toBe(false);
                expect(form2.history.canRedo).toBe(true);

                // then redo, form 2 should also redo

                form.redo();

                expect(form.value).toBe(200);
                expect(form.history.canUndo).toBe(true);
                expect(form.history.canRedo).toBe(false);
                expect(form2.value).toBe(400);
                expect(form2.history.canUndo).toBe(true);
                expect(form2.history.canRedo).toBe(false);
            });

            test(`should have a slave form whose history only contains snapshots that correspond to a master form's changes`, () => {

                // could be useful for independent state that needs to cancel and respond
                // to history changes in application data
                // such as focus, window position

                const form = new Dendriform(100, {history: 1000});
                const form2 = new Dendriform(0, {history: 1000, replace: true});

                form.onDerive((_value, {go, replace}) => {
                    if(go) return form2.go(go);
                    form2.replace(replace);

                    if(!replace) {
                        form2.set(noChange);
                    }
                });

                expect(form2.value).toBe(0);

                // make some arbitrary changes to slave

                form2.set(1);
                form2.set(2);

                expect(form2.value).toBe(2);
                expect(form2.core.state.historyStack.length).toBe(0);
                expect(form2.core.state.historyIndex).toBe(0);

                // make a change to master, and now slave should have a history item

                form.set(200);

                expect(form.value).toBe(200);
                expect(form.core.state.historyStack.length).toBe(1);
                expect(form.core.state.historyIndex).toBe(1);
                expect(form2.value).toBe(2);
                expect(form2.core.state.historyStack.length).toBe(1);
                expect(form2.core.state.historyIndex).toBe(1);

                // make a couple more changes to slave

                form2.set(3);
                form2.set(4);

                // now undo master, slave should go back to the state it was in
                // when master change #1 happened

                form.undo();

                expect(form.value).toBe(100);
                expect(form.core.state.historyStack.length).toBe(1);
                expect(form.core.state.historyIndex).toBe(0);
                expect(form2.value).toBe(2);
                expect(form2.core.state.historyStack.length).toBe(1);
                expect(form2.core.state.historyIndex).toBe(0);

                // now redo master, slave should go back to the state it was in
                // when master change #2 happened

                form.redo();

                expect(form.value).toBe(200);
                expect(form.core.state.historyStack.length).toBe(1);
                expect(form.core.state.historyIndex).toBe(1);
                expect(form2.value).toBe(4);
                expect(form2.core.state.historyStack.length).toBe(1);
                expect(form2.core.state.historyIndex).toBe(1);


            });

            describe('sync', () => {

                test(`should sync history stacks between 2 forms`, () => {

                    // could be useful for data partially derived in both directions
                    // such as item selection state
                    // where selection state is independent from application state
                    // but also contribute to a "common" history stack

                    const form = new Dendriform('1', {history: 1000});
                    const form2 = new Dendriform('', {history: 1000});

                    const changer1 = jest.fn();
                    form.onChange(changer1);

                    const changer2 = jest.fn();
                    form.onChange(changer2);

                    const unsync = sync(form, form2, (value) => {
                        form2.set(value + '?');
                    });

                    expect(form.value).toBe('1');
                    expect(form2.value).toBe('1?');
                    expect(form.core.state.historyStack.length).toBe(0);
                    expect(form2.core.state.historyStack.length).toBe(0);
                    expect(form.core.state.historyIndex).toBe(0);
                    expect(form2.core.state.historyIndex).toBe(0);

                    // set value of form 1

                    form.set('2');

                    expect(form.value).toBe('2');
                    expect(form2.value).toBe('2?');
                    expect(form.core.state.historyStack.length).toBe(1);
                    expect(form2.core.state.historyStack.length).toBe(1);
                    expect(form.core.state.historyIndex).toBe(1);
                    expect(form2.core.state.historyIndex).toBe(1);

                    // set value of form 2

                    form2.set('!!!');

                    expect(form.value).toBe('2');
                    expect(form2.value).toBe('!!!');
                    expect(form.core.state.historyStack.length).toBe(2);
                    expect(form2.core.state.historyStack.length).toBe(2);
                    expect(form.core.state.historyIndex).toBe(2);
                    expect(form2.core.state.historyIndex).toBe(2);

                    // should undo()

                    form.undo();

                    expect(form.value).toBe('2');
                    expect(form2.value).toBe('2?');
                    expect(form.core.state.historyStack.length).toBe(2);
                    expect(form2.core.state.historyStack.length).toBe(2);
                    expect(form.core.state.historyIndex).toBe(1);
                    expect(form2.core.state.historyIndex).toBe(1);

                    // should redo()

                    form.redo();

                    expect(form.value).toBe('2');
                    expect(form2.value).toBe('!!!');
                    expect(form.core.state.historyStack.length).toBe(2);
                    expect(form2.core.state.historyStack.length).toBe(2);
                    expect(form.core.state.historyIndex).toBe(2);
                    expect(form2.core.state.historyIndex).toBe(2);

                    // should undo() other

                    form2.undo();

                    expect(form.value).toBe('2');
                    expect(form2.value).toBe('2?');
                    expect(form.core.state.historyStack.length).toBe(2);
                    expect(form2.core.state.historyStack.length).toBe(2);

                    // should redo() other

                    form2.redo();

                    expect(form.value).toBe('2');
                    expect(form2.value).toBe('!!!');
                    expect(form.core.state.historyStack.length).toBe(2);
                    expect(form2.core.state.historyStack.length).toBe(2);

                    // should unsync

                    unsync();
                });

                test(`should sync history stacks between 2 forms with no deriving`, () => {

                    // could be useful for data partially derived in both directions
                    // such as item selection state
                    // where selection state is independent from application state
                    // but also contribute to a "common" history stack

                    const form = new Dendriform('', {history: 1000});
                    const form2 = new Dendriform('', {history: 1000});

                    sync(form, form2);

                    expect(form.value).toBe('');
                    expect(form2.value).toBe('');
                    expect(form.core.state.historyStack.length).toBe(0);
                    expect(form2.core.state.historyStack.length).toBe(0);
                    expect(form.core.state.historyIndex).toBe(0);
                    expect(form2.core.state.historyIndex).toBe(0);

                    // set value of form 1

                    form.set('A');

                    expect(form.value).toBe('A');
                    expect(form2.value).toBe('');
                    expect(form.core.state.historyStack.length).toBe(1);
                    expect(form2.core.state.historyStack.length).toBe(1);
                    expect(form.core.state.historyIndex).toBe(1);
                    expect(form2.core.state.historyIndex).toBe(1);

                    // set value of form 2

                    form2.set('B');

                    expect(form.value).toBe('A');
                    expect(form2.value).toBe('B');
                    expect(form.core.state.historyStack.length).toBe(2);
                    expect(form2.core.state.historyStack.length).toBe(2);
                    expect(form.core.state.historyIndex).toBe(2);
                    expect(form2.core.state.historyIndex).toBe(2);

                    // should undo()

                    form.undo();

                    expect(form.value).toBe('A');
                    expect(form2.value).toBe('');
                    expect(form.core.state.historyStack.length).toBe(2);
                    expect(form2.core.state.historyStack.length).toBe(2);
                    expect(form.core.state.historyIndex).toBe(1);
                    expect(form2.core.state.historyIndex).toBe(1);

                    // should undo() again

                    form.undo();

                    expect(form.value).toBe('');
                    expect(form2.value).toBe('');
                    expect(form.core.state.historyStack.length).toBe(2);
                    expect(form2.core.state.historyStack.length).toBe(2);
                    expect(form.core.state.historyIndex).toBe(0);
                    expect(form2.core.state.historyIndex).toBe(0);
                });

                test(`should sync history stacks between 2 forms, and replace`, () => {

                    const form = new Dendriform('1', {history: 1000});
                    const form2 = new Dendriform('', {history: 1000});

                    const changer1 = jest.fn();
                    form.onChange(changer1);

                    const changer2 = jest.fn();
                    form.onChange(changer2);

                    sync(form, form2, (value) => {
                        form2.set(value + '?');
                    });

                    expect(form.value).toBe('1');
                    expect(form2.value).toBe('1?');
                    expect(form.core.state.historyStack.length).toBe(0);
                    expect(form2.core.state.historyStack.length).toBe(0);
                    expect(form.core.state.historyIndex).toBe(0);
                    expect(form2.core.state.historyIndex).toBe(0);

                    // set value of form 1

                    form.set('2');

                    expect(form.value).toBe('2');
                    expect(form2.value).toBe('2?');
                    expect(form.core.state.historyStack.length).toBe(1);
                    expect(form2.core.state.historyStack.length).toBe(1);
                    expect(form.core.state.historyIndex).toBe(1);
                    expect(form2.core.state.historyIndex).toBe(1);

                    // set and replace

                    form.replace();
                    form.set('3');

                    expect(form.value).toBe('3');
                    expect(form2.value).toBe('3?');
                    expect(form.core.state.historyStack.length).toBe(1);
                    expect(form2.core.state.historyStack.length).toBe(1);
                    expect(form.core.state.historyIndex).toBe(1);
                    expect(form2.core.state.historyIndex).toBe(1);

                    // set regularly again

                    form.set('4');

                    expect(form.value).toBe('4');
                    expect(form2.value).toBe('4?');
                    expect(form.core.state.historyStack.length).toBe(2);
                    expect(form2.core.state.historyStack.length).toBe(2);
                    expect(form.core.state.historyIndex).toBe(2);
                    expect(form2.core.state.historyIndex).toBe(2);

                    // should undo()

                    form.undo();

                    expect(form.value).toBe('3');
                    expect(form2.value).toBe('3?');
                    expect(form.core.state.historyStack.length).toBe(2);
                    expect(form2.core.state.historyStack.length).toBe(2);
                    expect(form.core.state.historyIndex).toBe(1);
                    expect(form2.core.state.historyIndex).toBe(1);

                    form.undo();

                    expect(form.value).toBe('1');
                    expect(form2.value).toBe('1?');
                    expect(form.core.state.historyStack.length).toBe(2);
                    expect(form2.core.state.historyStack.length).toBe(2);
                    expect(form.core.state.historyIndex).toBe(0);
                    expect(form2.core.state.historyIndex).toBe(0);
                });

                test(`should error if synced forms do not have the same history items`, () => {

                    const form = new Dendriform('1', {history: 1000});
                    const form2 = new Dendriform('', {history: 100});;

                    expect(() => sync(form, form2)).toThrow('[Dendriform] sync() forms must have the same maximum number of history items configured');
                });
            });

            describe('cancel', () => {

                test(`should error if onDerive() has a deriver that throws an error`, () => {

                    const form = new Dendriform(1);
                    const form2 = new Dendriform(0);

                    const callback = jest.fn();
                    form.onChange(callback);

                    const deriver1 = jest.fn((value) => {
                        form2.set(value * 2);
                    });

                    const deriver2 = jest.fn((_value) => {
                        throw cancel('!!!');
                    });

                    form.onDerive(deriver1);

                    expect(() => form.onDerive(deriver2)).toThrow('onDerive() callback must not throw errors on first call.');
                    expect(callback).toHaveBeenCalledTimes(0);
                });

                test(`should cancel when deriver throws an error (and prior successful derives should be cancelled too)`, () => {

                    const form = new Dendriform(1, {history: 5});
                    const form2 = new Dendriform(0);

                    const callback = jest.fn();
                    const callback2 = jest.fn();
                    form.onChange(callback);
                    form2.onChange(callback2);

                    const cancelCallback = jest.fn();
                    form.onCancel(cancelCallback);

                    const deriver1 = jest.fn((value) => {
                        form2.set(value * 2);
                    });

                    const deriver2 = jest.fn((value) => {
                        if(value === 2) {
                            throw cancel('Two not allowed');
                        }
                    });

                    form.onDerive(deriver1);
                    form.onDerive(deriver2);

                    expect(form.value).toBe(1);
                    expect(form2.value).toBe(2);
                    expect(callback).toHaveBeenCalledTimes(0);
                    expect(callback2).toHaveBeenCalledTimes(1);
                    expect(form.history.canUndo).toBe(false);
                    expect(cancelCallback).toHaveBeenCalledTimes(0);

                    // this should cause deriver2 to throw
                    // and everything should be cancelled
                    form.set(2);

                    expect(form.value).toBe(1);
                    expect(form2.value).toBe(2);
                    expect(callback).toHaveBeenCalledTimes(0);
                    expect(callback2).toHaveBeenCalledTimes(1);
                    expect(form.history.canUndo).toBe(false);
                    expect(cancelCallback).toHaveBeenCalledTimes(1);
                    expect(cancelCallback.mock.calls[0][0]).toBe('Two not allowed');

                    // this should NOT cause deriver2 to throw
                    // and everything should succeed
                    form.set(3);

                    expect(form.value).toBe(3);
                    expect(form2.value).toBe(6);
                    expect(callback).toHaveBeenCalledTimes(1);
                    expect(callback2).toHaveBeenCalledTimes(2);
                    expect(form.history.canUndo).toBe(true);
                    expect(cancelCallback).toHaveBeenCalledTimes(1);
                });

                test(`should cancel when deriver throws an error in a chain`, () => {

                    const form = new Dendriform(1, {history: 5});
                    const form2 = new Dendriform(0);

                    const callback = jest.fn();
                    const callback2 = jest.fn();
                    form.onChange(callback);
                    form2.onChange(callback2);

                    const deriver1 = jest.fn((value) => {
                        form2.set(value * 2);
                    });

                    const deriver2 = jest.fn((value) => {
                        if(value === 4) {
                            throw cancel('Four not allowed');
                        }
                    });

                    form.onDerive(deriver1);
                    form2.onDerive(deriver2);

                    // this should cause deriver2 to throw
                    // and everything should be cancelled
                    form.set(2);

                    expect(form.value).toBe(1);
                    expect(form2.value).toBe(2);
                    expect(callback).toHaveBeenCalledTimes(0);
                    expect(callback2).toHaveBeenCalledTimes(1);
                    expect(form.history.canUndo).toBe(false);

                    // this should NOT cause deriver2 to throw
                    // and everything should succeed
                    form.set(3);

                    expect(form.value).toBe(3);
                    expect(form2.value).toBe(6);
                    expect(callback).toHaveBeenCalledTimes(1);
                    expect(callback2).toHaveBeenCalledTimes(2);
                    expect(form.history.canUndo).toBe(true);
                });

                test(`should not cancel when using force`, () => {

                    const form = new Dendriform(1, {history: 5});
                    const form2 = new Dendriform(0);

                    const deriver = jest.fn((value, {force}) => {
                        if(value === 2 && !force) {
                            throw cancel('Two not allowed');
                        }
                        form2.set(value);
                    });

                    form.onDerive(deriver);

                    expect(form.value).toBe(1);
                    expect(form2.value).toBe(1);

                    // this should cause deriver to throw
                    // and everything should be cancelled
                    form.set(2);
                    expect(form.value).toBe(1);
                    expect(form2.value).toBe(1);

                    // this should NOT cause deriver to throw
                    // and everything should be changed
                    form.set(2, {force: true});
                    expect(form.value).toBe(2);
                    expect(form2.value).toBe(2);
                });

                test(`should use useCancel`, () => {

                    const firstHook = renderHook(() => useDendriform(1));

                    const deriver = jest.fn((value, _details) => {
                        if(value === 2) {
                            throw cancel('Two not allowed');
                        }
                    });

                    const cancelCallback = jest.fn();

                    const form = firstHook.result.current;
                    renderHook(() => {
                        form.useDerive(deriver);
                        form.useCancel(cancelCallback);
                    });

                    act(() => {
                        form.set(2);
                    });

                    expect(cancelCallback).toHaveBeenCalledTimes(1);
                    expect(cancelCallback.mock.calls[0][0]).toBe('Two not allowed');
                });
            });
        });

        describe('useDendriform() and .useDerive()', () => {
            test(`should derive`, () => {

                const firstHook = renderHook(() => useDendriform(() => ({
                    number: 100,
                    doubled: 0
                })));

                const deriver = jest.fn((value, _details) => {
                    form.branch('doubled').set(value.number * 2);
                });

                const form = firstHook.result.current;
                renderHook(() => form.useDerive(deriver));

                act(() => {
                    form.branch('number').set(200);
                });

                expect(deriver).toHaveBeenCalledTimes(2);
                expect(deriver.mock.calls[1][0]).toEqual({
                    number: 200,
                    doubled: 200
                });
            });
        });

        describe('useDendriform() and .useSync()', () => {
            test(`should sync`, () => {

                const masterHook = renderHook(() => useDendriform(() => 'hi'));
                const slaveHook = renderHook(() => useDendriform(() => 0));

                const masterForm = masterHook.result.current;
                const slaveForm = slaveHook.result.current;

                renderHook(() => {
                    useSync(masterForm, slaveForm);
                });

                act(() => {
                    masterForm.set('hello');
                    slaveForm.set(12);
                });

                expect(masterForm.value).toBe('hello');
                expect(slaveForm.value).toBe(12);
            });
        });
    });

    describe(`nodes behaviour`, () => {

        test(`should add nodes as data is traversed`, () => {
            const form = new Dendriform({
                foo: {
                    bar: 123,
                    baz: 456
                }
            });


            expect(form.core.state.nodes).toEqual({
                '0': {
                    child: {},
                    id: '0',
                    parentId: '',
                    type: OBJECT
                }
            });

            form.branch('foo');

            expect(form.core.state.nodes).toEqual({
                '0': {
                    child: {
                        foo: '1'
                    },
                    id: '0',
                    parentId: '',
                    type: OBJECT
                },
                '1': {
                    child: {},
                    id: '1',
                    parentId: '0',
                    type: OBJECT
                }
            });

            form.branch(['foo','bar']);

            expect(form.core.state.nodes).toEqual({
                '0': {
                    child: {
                        foo: '1'
                    },
                    id: '0',
                    parentId: '',
                    type: OBJECT
                },
                '1': {
                    child: {
                        bar: '2'
                    },
                    id: '1',
                    parentId: '0',
                    type: OBJECT
                },
                '2': {
                    id: '2',
                    parentId: '1',
                    type: BASIC
                }
            });
        });

        test(`should remove nodes as data is deleted (no changed types)`, () => {
            const form = new Dendriform<any>({
                foo: {
                    bar: 123,
                    baz: 456
                }
            });

            form.branch(['foo','bar']);

            expect(form.core.state.nodes).toEqual({
                '0': {
                    child: {
                        foo: '1'
                    },
                    id: '0',
                    parentId: '',
                    type: OBJECT
                },
                '1': {
                    child: {
                        bar: '2'
                    },
                    id: '1',
                    parentId: '0',
                    type: OBJECT
                },
                '2': {
                    id: '2',
                    parentId: '1',
                    type: BASIC
                }
            });

            form.branch('foo').set({});

            expect(form.core.state.nodes).toEqual({
                '0': {
                    child: {
                        foo: '1'
                    },
                    id: '0',
                    parentId: '',
                    type: OBJECT
                },
                '1': {
                    child: {},
                    id: '1',
                    parentId: '0',
                    type: OBJECT
                }
            });
        });

         test(`should remove nodes as parent changes type`, () => {
            const form = new Dendriform<any>({
                foo: {
                    bar: 123,
                    baz: 456
                }
            });

            form.branch(['foo','bar']);

            expect(form.core.state.nodes).toEqual({
                '0': {
                    child: {
                        foo: '1'
                    },
                    id: '0',
                    parentId: '',
                    type: OBJECT
                },
                '1': {
                    child: {
                        bar: '2'
                    },
                    id: '1',
                    parentId: '0',
                    type: OBJECT
                },
                '2': {
                    id: '2',
                    parentId: '1',
                    type: BASIC
                }
            });

            form.branch('foo').set([]);

            expect(form.core.state.nodes).toEqual({
                '0': {
                    child: {
                        foo: '1'
                    },
                    id: '0',
                    parentId: '',
                    type: OBJECT
                },
                '1': {
                    child: [],
                    id: '1',
                    parentId: '0',
                    type: ARRAY
                }
            });
        });

        test(`should retain common nodes when data is replaced`, () => {
            const form = new Dendriform<any>({
                foo: {
                    bar: 123,
                    baz: 456
                }
            });

            form.branch(['foo','bar']);
            form.branch(['foo','baz']);

            expect(form.core.state.nodes).toEqual({
                '0': {
                    child: {
                        foo: '1'
                    },
                    id: '0',
                    parentId: '',
                    type: OBJECT
                },
                '1': {
                    child: {
                        bar: '2',
                        baz: '3'
                    },
                    id: '1',
                    parentId: '0',
                    type: OBJECT
                },
                '2': {
                    id: '2',
                    parentId: '1',
                    type: BASIC
                },
                '3': {
                    id: '3',
                    parentId: '1',
                    type: BASIC
                }
            });

            form.set({
                foo: {
                    bar: 123
                }
            });

            expect(form.core.state.nodes).toEqual({
                '0': {
                    child: {
                        foo: '1'
                    },
                    id: '0',
                    parentId: '',
                    type: OBJECT
                },
                '1': {
                    child: {
                        bar: '2'
                    },
                    id: '1',
                    parentId: '0',
                    type: OBJECT
                },
                '2': {
                    id: '2',
                    parentId: '1',
                    type: BASIC
                }
            });
        });

        test(`should retain nothing when data is replaced at source`, () => {
            const form = new Dendriform<any>({
                foo: {
                    bar: 123,
                    baz: 456
                }
            });

            form.branch(['foo','bar']);
            form.branch(['foo','baz']);

            expect(form.core.state.nodes).toEqual({
                '0': {
                    child: {
                        foo: '1'
                    },
                    id: '0',
                    parentId: '',
                    type: OBJECT
                },
                '1': {
                    child: {
                        bar: '2',
                        baz: '3'
                    },
                    id: '1',
                    parentId: '0',
                    type: OBJECT
                },
                '2': {
                    id: '2',
                    parentId: '1',
                    type: BASIC
                },
                '3': {
                    id: '3',
                    parentId: '1',
                    type: BASIC
                }
            });

            form.set({});

            expect(form.core.state.nodes).toEqual({
                '0': {
                    child: {},
                    id: '0',
                    parentId: '',
                    type: OBJECT
                }
            });
        });

        test(`should retain common nodes when data is replaced on array`, () => {
            const form = new Dendriform<any>([123, 456, 789]);

            form.branch(2);
            form.branch(1);
            form.branch(0);

            expect(form.core.state.nodes).toEqual({
                '0': {
                    child: ['3','2','1'],
                    id: '0',
                    parentId: '',
                    type: ARRAY
                },
                '1': {
                    id: '1',
                    parentId: '0',
                    type: BASIC
                },
                '2': {
                    id: '2',
                    parentId: '0',
                    type: BASIC
                },
                '3': {
                    id: '3',
                    parentId: '0',
                    type: BASIC
                }
            });

            form.set([123, 456]);

            expect(form.core.state.nodes).toEqual({
                '0': {
                    child: ['3','2'],
                    id: '0',
                    parentId: '',
                    type: ARRAY
                },
                '2': {
                    id: '2',
                    parentId: '0',
                    type: BASIC
                },
                '3': {
                    id: '3',
                    parentId: '0',
                    type: BASIC
                }
            });
        });

        test(`should retain common nodes when data is replaced on array containing objects`, () => {
            const form = new Dendriform<any>([{foo: 123}, {foo: 456}]);

            form.branch([0,'foo']);
            form.branch([1,'foo']);

            expect(form.core.state.nodes).toEqual({
                '0': {
                    child: ['1','3'],
                    id: '0',
                    parentId: '',
                    type: ARRAY
                },
                '1': {
                    id: '1',
                    child: {
                        foo: '2'
                    },
                    parentId: '0',
                    type: OBJECT
                },
                '2': {
                    id: '2',
                    parentId: '1',
                    type: BASIC
                },
                '3': {
                    id: '3',
                    child: {
                        foo: '4'
                    },
                    parentId: '0',
                    type: OBJECT
                },
                '4': {
                    id: '4',
                    parentId: '3',
                    type: BASIC
                }
            });

            form.set([{foo: 123}, {foo: 456}], {track: false});

            expect(form.core.state.nodes).toEqual({
                '0': {
                    child: ['1','3'],
                    id: '0',
                    parentId: '',
                    type: ARRAY
                },
                '1': {
                    id: '1',
                    child: {
                        foo: '2'
                    },
                    parentId: '0',
                    type: OBJECT
                },
                '2': {
                    id: '2',
                    parentId: '1',
                    type: BASIC
                },
                '3': {
                    id: '3',
                    child: {
                        foo: '4'
                    },
                    parentId: '0',
                    type: OBJECT
                },
                '4': {
                    id: '4',
                    parentId: '3',
                    type: BASIC
                }
            });
        });

    });

    describe(`plugins`, () => {

        const initMock = jest.fn();

        class MyPlugin extends Plugin {

            public readonly state = {
                calledTimes: 0
            };

            clone(): MyPlugin {
                return new MyPlugin();
            }

            init(form: Dendriform<PluginValue>) {
                initMock(form);
            }

            mypluginFunction(): string {
                this.state.calledTimes++;
                return this.id;
            }
        }

        test(`should contain value`, () => {
            
            const value: PluginValue = {
                foo: true,
                bar: true
            };
    
            const plugins = {
                myplugin: new MyPlugin()
            };
    
            const form = new Dendriform(value, {plugins});
    
            expect(initMock).toHaveBeenCalledTimes(1);
            expect(initMock.mock.calls[0][0]).toBe(form);

            const pluginResult = form.plugins.myplugin.mypluginFunction();
            const pluginResult2 = form.branch('foo').plugins.myplugin.mypluginFunction();

            expect(pluginResult).toBe('0');
            expect(pluginResult2).toBe('1');
            expect(form.plugins.myplugin.state.calledTimes).toBe(2);
    
        });

        describe('useDendriform() with plugins', () => {
            test(`should accept plugins with a function that returns a plugin object`, () => {

                const plugins = () => ({
                    myplugin: new MyPlugin()
                });
    
                const firstHook = renderHook(() => useDendriform(123, {plugins}));
    
                const form = firstHook.result.current;
                expect(form.plugins.myplugin instanceof MyPlugin).toBe(true);
            });
        });
    });

    describe(`readonly`, () => {

        test(`should create readonly form`, () => {
            const form = new Dendriform(123);

            expect(() => form.readonly().set(456)).toThrow(`[Dendriform] Cannot call .set() or .go() on a readonly form`);
            expect(() => form.readonly().undo()).toThrow(`[Dendriform] Cannot call .set() or .go() on a readonly form`);
        });

        test(`should create readonly forms branched from a readonly form`, () => {
            const form = new Dendriform({foo: 123});

            expect(() => form.readonly().branch('foo').set(456)).toThrow(`[Dendriform] Cannot call .set() or .go() on a readonly form`);
            expect(() => form.branch('foo').set(456)).not.toThrow();
            expect(() => form.readonly().branch('foo').set(456)).toThrow(`[Dendriform] Cannot call .set() or .go() on a readonly form`);
            // @ts-ignore
            expect(() => form.readonly().branch('foo').setParent({foo: 456})).toThrow(`[Dendriform] Cannot call .set() or .go() on a readonly form`);
        });
    });
});
