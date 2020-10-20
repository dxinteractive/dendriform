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

describe(`Dendriform`, () => {

    describe(`without branching`, () => {

        test(`should contain value`, () => {
            const form = new Dendriform({
                initialValue: 123
            });

            expect(form.value).toBe(123);
            expect(form.id).toBe(0);
        });

        test(`should produce value`, () => {
            const form = new Dendriform({
                initialValue: 123
            });

            form.produce(456);
            form.core.changeBuffer.flush();

            expect(form.value).toBe(456);
            expect(form.id).toBe(0);
        });

        test(`should produce value from immer producer`, () => {
            const form = new Dendriform({
                initialValue: 1
            });

            form.produce(draft => draft + 1);
            form.core.changeBuffer.flush();

            expect(form.value).toBe(2);
            expect(form.id).toBe(0);
        });
    });

    describe('.useValue()', () => {
        test(`should provide value and produce an update`, () => {

            const firstHook = renderHook(() => useDendriform({
                initialValue: 123
            }));

            const form = firstHook.result.current;
            const {result} = renderHook(() => form.useValue());
            expect(result.current[0]).toBe(123);

            act(() => {
                result.current[1](456);
            });

            expect(result.current[0]).toBe(123);
            // TODO in future, should have optimistically updated
            // expect(result.current[0]).toBe(456);

            act(() => {
                form.core.changeBuffer.flush();
            });
            // should have updated from top down (same result)
            expect(result.current[0]).toBe(456);
        });
    });

    describe(`.get()`, () => {

        test(`should get child value`, () => {
            const form = new Dendriform({
                initialValue: ['A','B','C']
            });

            const bForm = form.get(1);

            expect(bForm.value).toBe('B');
            expect(bForm.id).toBe(2);
        });

        test(`should produce child value with new value`, () => {
            const form = new Dendriform({
                initialValue: ['A','B','C']
            });

            const secondElement = form.get(1);
            const nodesBefore = form.core.nodes;
            secondElement.produce('B!');
            form.core.changeBuffer.flush();

            expect(form.value).toEqual(['A','B!','C']);
            expect(form.core.nodes).toEqual(nodesBefore);
        });

        test(`should produce child value with immer producer`, () => {
            const form = new Dendriform({
                initialValue: {foo: [1,2]}
            });

            form.get('foo').produce(draft => {
                draft.unshift(0);
            });
            form.get('foo').produce(draft => {
                draft.unshift(-1);
            });
            form.core.changeBuffer.flush();

            expect(form.value).toEqual({foo: [-1,0,1,2]});
        });

        test(`should return same instance for all .get()s to same child`, () => {
            const form = new Dendriform({
                initialValue: ['A','B','C']
            });

            expect(form.get(1)).toBe(form.get(1));
        });

        // TODO what about misses?
    });

    describe(`.get() deep`, () => {

        test(`should get child value`, () => {
            const form = new Dendriform({
                initialValue: {
                    foo: {
                        bar: 123
                    }
                }
            });

            const barForm = form.get(['foo','bar']);

            expect(barForm.value).toBe(123);
            expect(barForm.id).toBe(2);
        });

        test(`should produce child value with new value`, () => {
            const form = new Dendriform({
                initialValue: {
                    foo: {
                        bar: 123
                    }
                }
            });

            form.get(['foo','bar']).produce(456);
            form.core.changeBuffer.flush();

            expect(form.value).toEqual({
                foo: {
                    bar: 456
                }
            });
        });
    });

    describe(`.branch()`, () => {

        describe(`branching`, () => {

            test(`should branch no levels and return React element`, () => {
                const form = new Dendriform({
                    initialValue: ['A','B','C']
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.branch(renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(1);
                expect(renderer.mock.calls[0][0]).toBe(form);
                expect(renderer.mock.calls[0][0].value).toBe(form.value);
                expect(wrapper.find('.branch').length).toBe(1);
            });

            test(`should branch no levels (using []) and return React element`, () => {
                const form = new Dendriform({
                    initialValue: ['A','B','C']
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.branch([], renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(1);
                expect(renderer.mock.calls[0][0].value).toBe(form.value);
                expect(wrapper.find('.branch').length).toBe(1);
            });

            test(`should branch one level and return React element`, () => {
                const form = new Dendriform({
                    initialValue: ['A','B','C']
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.branch(1, renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(1);
                expect(renderer.mock.calls[0][0]).toBe(form.get(1));
                expect(renderer.mock.calls[0][0].value).toBe(form.get(1).value);
                expect(wrapper.find('.branch').length).toBe(1);
            });

            test(`should branch multiple levels and return React element`, () => {
                const form = new Dendriform({
                    initialValue: [[['A','B']]]
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[][][]>) => {
                    return props.form.branch([0,0,1], renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(1);
                expect(renderer.mock.calls[0][0]).toBe(form.get([0,0,1]));
                expect(renderer.mock.calls[0][0].value).toBe(form.get([0,0,1]).value);
                expect(wrapper.find('.branch').length).toBe(1);
            });
        });

        describe(`react memo and deps`, () => {

            test(`should not re-render when unrelated props changes`, () => {
                const form = new Dendriform({
                    initialValue: ['A','B','C']
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.branch(1, renderer);
                };

                const wrapper = mount(<MyComponent foo={1} form={form} />);

                expect(renderer).toHaveBeenCalledTimes(1);

                // should not update if unrelated props change
                wrapper.setProps({foo: 2, form});
                expect(renderer).toHaveBeenCalledTimes(1);
            });

            test(`should branch no levels with deps`, () => {
                const form = new Dendriform({
                    initialValue: ['A','B','C']
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.branch(renderer, [props.foo]);
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

            test(`should branch no levels (using []) with deps`, () => {
                const form = new Dendriform({
                    initialValue: ['A','B','C']
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.branch([], renderer, [props.foo]);
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

            test(`should branch one level with deps`, () => {
                const form = new Dendriform({
                    initialValue: ['A','B','C']
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.branch(1, renderer, [props.foo]);
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

            test(`should branch multiple levels with deps`, () => {
                const form = new Dendriform({
                    initialValue: [[['A','B']]]
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[][][]>) => {
                    return props.form.branch([0,0,1], renderer, [props.foo]);
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

    describe(`.branchAll()`, () => {

        describe(`branching`, () => {

            test(`should error if branching a non-array`, () => {
                const consoleError = console.error;
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                console.error = () => {};

                const form = new Dendriform({
                    initialValue: '4'
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string>) => {
                    return props.form.branchAll(renderer);
                };

                expect(() => mount(<MyComponent form={form} foo={1} />)).toThrow('branchAll() can only be called on forms containing arrays');

                console.error = consoleError;
            });

            test(`should branchAll no levels and return React element`, () => {
                const form = new Dendriform({
                    initialValue: ['A','B','C']
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.branchAll(renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(3);
                expect(renderer.mock.calls[0][0].value).toBe(form.get(0).value);
                expect(renderer.mock.calls[1][0].value).toBe(form.get(1).value);
                expect(renderer.mock.calls[2][0].value).toBe(form.get(2).value);
                expect(wrapper.find('.branch').length).toBe(3);
            });

            test(`should branchAll no levels (using []) and return React element`, () => {
                const form = new Dendriform({
                    initialValue: ['A','B','C']
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.branchAll([], renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(3);
                expect(renderer.mock.calls[0][0].value).toBe(form.get(0).value);
                expect(renderer.mock.calls[1][0].value).toBe(form.get(1).value);
                expect(renderer.mock.calls[2][0].value).toBe(form.get(2).value);
                expect(wrapper.find('.branch').length).toBe(3);
            });

            test(`should branchAll one level and return React element`, () => {
                const form = new Dendriform({
                    initialValue: {foo: ['A','B','C']}
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<{foo: string[]}>) => {
                    return props.form.branchAll('foo', renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(3);
                expect(renderer.mock.calls[0][0].value).toBe(form.get(['foo', 0]).value);
                expect(renderer.mock.calls[1][0].value).toBe(form.get(['foo', 1]).value);
                expect(renderer.mock.calls[2][0].value).toBe(form.get(['foo', 2]).value);
                expect(wrapper.find('.branch').length).toBe(3);
            });

            test(`should branchAll multiple levels and return React element`, () => {
                const form = new Dendriform({
                    initialValue: [[['A','B']]]
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[][][]>) => {
                    return props.form.branchAll([0,0], renderer);
                };

                const wrapper = mount(<MyComponent form={form} foo={1} />);

                expect(renderer).toHaveBeenCalledTimes(2);
                expect(renderer.mock.calls[0][0].value).toBe(form.get([0,0,0]).value);
                expect(renderer.mock.calls[1][0].value).toBe(form.get([0,0,1]).value);
                expect(wrapper.find('.branch').length).toBe(2);
            });
        });

        describe(`react memo and deps`, () => {

            test(`should not re-render when unrelated props changes`, () => {
                const form = new Dendriform({
                    initialValue: ['A','B','C']
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.branchAll(renderer);
                };

                const wrapper = mount(<MyComponent foo={1} form={form} />);

                expect(renderer).toHaveBeenCalledTimes(3);

                // should not update if unrelated props change
                wrapper.setProps({foo: 2, form});
                expect(renderer).toHaveBeenCalledTimes(3);
            });

            test(`should branchAll no levels with deps`, () => {
                const form = new Dendriform({
                    initialValue: ['A','B','C']
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.branchAll(renderer, [props.foo]);
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

            test(`should branchAll no levels (using []) with deps`, () => {
                const form = new Dendriform({
                    initialValue: ['A','B','C']
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[]>) => {
                    return props.form.branchAll([], renderer, [props.foo]);
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

            test(`should branchAll one level with deps`, () => {
                const form = new Dendriform({
                    initialValue: {foo: ['A','B','C']}
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<{foo: string[]}>) => {
                    return props.form.branchAll('foo', renderer, [props.foo]);
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

            test(`should branchAll multiple levels with deps`, () => {
                const form = new Dendriform({
                    initialValue: [[['A','B']]]
                });

                const renderer = jest.fn(form => <div className="branch">{form.value}</div>);

                const MyComponent = (props: MyComponentProps<string[][][]>) => {
                    return props.form.branchAll([0,0], renderer, [props.foo]);
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
});
