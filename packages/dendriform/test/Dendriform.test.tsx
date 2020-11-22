import {useDendriform, Dendriform} from '../src/index';
import {renderHook, act} from '@testing-library/react-hooks';

import React from 'react';
import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

Enzyme.configure({
    adapter: new Adapter()
});

type MyComponentProps<V> = {
    foo: number;
    bar?: number;
    form: Dendriform<V>;
};

type NotSetTestValue = {
    foo?: string;
    bar?: string;
};

describe(`Dendriform`, () => {

    describe(`value and change`, () => {

        test(`should contain value`, () => {
            const form = new Dendriform(123);

            expect(form.value).toBe(123);
            expect(form.id).toBe(0);
        });

        test(`should set value`, () => {
            const form = new Dendriform(123);

            form.set(456);
            form.core.changeBuffer.flush();

            expect(form.value).toBe(456);
            expect(form.id).toBe(0);
        });

        test(`should set value from immer producer`, () => {
            const form = new Dendriform(1);

            form.set(draft => draft + 1);
            form.core.changeBuffer.flush();

            expect(form.value).toBe(2);
            expect(form.id).toBe(0);
        });

        test(`merging multiple sets`, () => {
            const form = new Dendriform(1);

            form.set(draft => draft + 1);
            form.set(draft => draft + 1);
            form.set(draft => draft + 1);
            form.core.changeBuffer.flush();

            expect(form.value).toBe(4);
            expect(form.id).toBe(0);

            form.set(draft => draft + 1);
            form.set(draft => draft + 1);
            form.core.changeBuffer.flush();

            expect(form.value).toBe(6);
        });
    });

    describe('useDendriform() and .useValue()', () => {
        test(`should provide value and produce an update`, () => {

            const firstHook = renderHook(() => useDendriform(123));

            const form = firstHook.result.current;
            const {result} = renderHook(() => form.useValue());
            expect(result.current[0]).toBe(123);

            act(() => {
                result.current[1](456);
            });

            // testing for future optimistic updates cna be done here

            act(() => {
                form.core.changeBuffer.flush();
            });
            // should have updated from top down (same result)
            expect(result.current[0]).toBe(456);
        });
    });

    describe('useDendriform() and .useIndex()', () => {
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
                form.core.changeBuffer.flush();
            });

            // should have updated index
            expect(result.current).toBe(1);
            expect(elementForm.index).toBe(1);

            act(() => {
                form.set(draft => {
                    draft.push('y');
                });
                form.core.changeBuffer.flush();
            });

            // should not have updated index
            expect(result.current).toBe(1);
        });
    });

    describe('useDendriform() and .useChange()', () => {
        test(`should provide value and produce an update`, () => {

            const firstHook = renderHook(() => useDendriform(() => 123));
            const callback = jest.fn();

            const form = firstHook.result.current;
            const {result} = renderHook(() => form.useValue());
            renderHook(() => form.useChange(callback));

            act(() => {
                result.current[1](456);
                form.core.changeBuffer.flush();
            });

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0]).toBe(456);
        });
    });

    describe(`history`, () => {

        test(`should undo`, () => {
            const form = new Dendriform(123, {history: 100});

            form.set(456);
            form.core.changeBuffer.flush();

            form.set(789);
            form.core.changeBuffer.flush();

            expect(form.value).toBe(789);

            form.undo();

            expect(form.value).toBe(456);

            form.undo();

            expect(form.value).toBe(123);

            form.undo();

            expect(form.value).toBe(123);
        });

        test(`should not undo if no history is configured`, () => {
            const form = new Dendriform(123);

            form.set(456);
            form.core.changeBuffer.flush();

            form.set(789);
            form.core.changeBuffer.flush();

            expect(form.value).toBe(789);

            form.undo();

            expect(form.value).toBe(789);
        });

        test(`should undo a limited number of times`, () => {
            const form = new Dendriform(123, {history: 1});

            form.set(456);
            form.core.changeBuffer.flush();

            form.set(789);
            form.core.changeBuffer.flush();

            expect(form.value).toBe(789);

            form.undo();

            expect(form.value).toBe(456);

            form.undo();

            expect(form.value).toBe(456);
        });

        test(`should redo`, () => {
            const form = new Dendriform(123, {history: 100});

            form.set(456);
            form.core.changeBuffer.flush();

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
            form.core.changeBuffer.flush();

            expect(form.value).toBe(456);

            form.undo();

            expect(form.value).toBe(123);

            form.set(789);
            form.core.changeBuffer.flush();

            expect(form.value).toBe(789);

            form.undo();

            expect(form.value).toBe(123);

            form.redo();

            expect(form.value).toBe(789);
        });

        test(`should undo merged changes`, () => {
            const form = new Dendriform(0, {history: 100});

            form.set(draft => draft + 1);
            form.set(draft => draft + 1);
            form.set(draft => draft + 1);
            form.core.changeBuffer.flush();

            expect(form.value).toBe(3);

            form.undo();

            expect(form.value).toBe(0);

            form.redo();

            expect(form.value).toBe(3);
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
                    form.core.changeBuffer.flush();
                });

                const result2 = result.current;

                expect(result.current).toEqual({
                    canUndo: true,
                    canRedo: false
                });

                expect(form.history).toEqual({
                    canUndo: true,
                    canRedo: false
                });

                act(() => {
                    form.set(789);
                    form.core.changeBuffer.flush();
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
    });

    describe(`.branch()`, () => {

        test(`should get child value`, () => {
            const form = new Dendriform(['A','B','C']);

            const bForm = form.branch(1);

            expect(bForm.value).toBe('B');
            expect(bForm.id).toBe(2);
        });

        test(`should produce child value with new value`, () => {
            const form = new Dendriform(['A','B','C']);

            const secondElement = form.branch(1);
            const nodesBefore = form.core.nodes;
            secondElement.set('B!');
            form.core.changeBuffer.flush();

            expect(form.value).toEqual(['A','B!','C']);
            expect(form.core.nodes).toEqual(nodesBefore);
        });

        test(`should produce child value with immer producer`, () => {
            const form = new Dendriform({foo: [1,2]});

            form.branch('foo').set(draft => {
                draft.unshift(0);
            });
            form.branch('foo').set(draft => {
                draft.unshift(-1);
            });
            form.core.changeBuffer.flush();

            expect(form.value).toEqual({foo: [-1,0,1,2]});
        });

        test(`should return same instance for all .branch()s to same child`, () => {
            const form = new Dendriform(['A','B','C']);

            expect(form.branch(1)).toBe(form.branch(1));
        });

        describe('not set values', () => {
            test(`should get child value`, () => {
                const form = new Dendriform<NotSetTestValue>({foo: 'a'});

                const bForm = form.branch('bar');

                expect(bForm.value).toBe(undefined);
                expect(bForm.id).toBe(2);
            });

            test(`should produce child value with new value`, () => {
                const form = new Dendriform<NotSetTestValue>({foo: 'a'});

                const bForm = form.branch('bar');
                const nodesBefore = form.core.nodes;
                bForm.set('B!');
                form.core.changeBuffer.flush();

                expect(form.value).toEqual({foo: 'a', bar: 'B!'});
                expect(form.core.nodes).toEqual(nodesBefore);
            });
        });

        test(`should produce parent value with setParent`, () => {
            const form = new Dendriform(['A','B','C']);

            const update = jest.fn((_key) => ['X']);

            form.branch(2).setParent(update);
            form.core.changeBuffer.flush();

            expect(update).toHaveBeenCalledTimes(1);
            expect(update.mock.calls[0][0]).toBe(2);
            expect(form.value).toEqual(['X']);
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
            expect(barForm.id).toBe(2);
        });

        test(`should produce child value with new value`, () => {
            const form = new Dendriform({
                foo: {
                    bar: 123
                }
            });

            form.branch(['foo','bar']).set(456);
            form.core.changeBuffer.flush();

            expect(form.value).toEqual({
                foo: {
                    bar: 456
                }
            });
        });
    });

    describe(`.branchAll()`, () => {

        test(`should branchAll() no levels`, () => {
            const form = new Dendriform(['A','B','C']);
            const forms = form.branchAll();

            expect(forms.map(f => f.value)).toEqual(['A','B','C']);
            expect(forms.map(f => f.id)).toEqual([1,2,3]);
        });

        test(`should branchAll() no levels (using [])`, () => {
            const form = new Dendriform(['A','B','C']);
            const forms = form.branchAll([]);

            expect(forms.map(f => f.value)).toEqual(['A','B','C']);
            expect(forms.map(f => f.id)).toEqual([1,2,3]);
        });

        test(`should branchAll() one level with key`, () => {
            const form = new Dendriform({foo: ['A','B','C']});
            const forms = form.branchAll('foo');

            expect(forms.map(f => f.value)).toEqual(['A','B','C']);
            expect(forms.map(f => f.id)).toEqual([2,3,4]);
        });

        test(`should branchAll() one level with path`, () => {
            const form = new Dendriform({foo: ['A','B','C']});
            const forms = form.branchAll(['foo']);

            expect(forms.map(f => f.value)).toEqual(['A','B','C']);
            expect(forms.map(f => f.id)).toEqual([2,3,4]);
        });

        test(`should branchAll() two levels with path`, () => {
            const form = new Dendriform({
                foo: {
                    bar: ['A','B','C']
                }
            });

            const forms = form.branchAll(['foo', 'bar']);

            expect(forms.map(f => f.value)).toEqual(['A','B','C']);
            expect(forms.map(f => f.id)).toEqual([3,4,5]);
        });

        test(`should produce child value with new value`, () => {
            const form = new Dendriform(['A','B','C']);

            const forms = form.branchAll();
            const nodesBefore = form.core.nodes;
            forms[1].set('B!');
            form.core.changeBuffer.flush();

            expect(form.value).toEqual(['A','B!','C']);
            expect(form.core.nodes).toEqual(nodesBefore);
        });

        test(`should return same instance for all .branchAll()s to same child`, () => {
            const form = new Dendriform(['A','B','C']);

            expect(form.branchAll()).toEqual(form.branchAll());
        });

        test(`should error if getting a non-array`, () => {
            const form = new Dendriform(123);

            expect(() => form.branchAll()).toThrow('branchAll() can only be called on forms containing arrays');
        });

        // TODO what about misses?
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

            test(`should error if rendering a non-array`, () => {
                const consoleError = console.error;
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                console.error = () => {};

                const form = new Dendriform('4');

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string>) => {
                    return props.form.renderAll(renderer);
                };

                expect(() => mount(<MyComponent form={form} foo={1} />)).toThrow('renderAll() can only be called on forms containing arrays');

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
            form.core.changeBuffer.flush();
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0]).toBe(456);
            expect(callback.mock.calls[0][1]).toEqual({
                patches: [{op: 'replace', path: [], value: 456}]
            });

            // should not be called if value is the same
            form.set(456);
            form.core.changeBuffer.flush();
            expect(callback).toHaveBeenCalledTimes(1);

            // should be called if value changes again
            form.set(457);
            form.core.changeBuffer.flush();
            expect(callback).toHaveBeenCalledTimes(2);
            expect(callback.mock.calls[1][0]).toBe(457);

            // should not be called once cancel is called
            cancel();
            form.set(458);
            form.core.changeBuffer.flush();
            expect(callback).toHaveBeenCalledTimes(2);
        });

        test(`should be called when value is undone`, () => {
            const callback = jest.fn();
            const form = new Dendriform(123, {history: 100});
            form.onChange(callback);

            form.set(456);
            form.core.changeBuffer.flush();

            form.undo();

            expect(callback).toHaveBeenCalledTimes(2);
            expect(callback.mock.calls[1][0]).toBe(123);
            expect(callback.mock.calls[1][1]).toEqual({
                patches: [{op: 'replace', path: [], value: 123}]
            });
        });

    });
});
