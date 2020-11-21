import {useInput, Dendriform} from '../src/index';
import {renderHook, act} from '@testing-library/react-hooks';
import type {ChangeEvent} from 'react';

jest.useFakeTimers();

describe(`useInput`, () => {

    test(`should adapt form to fit input props`, () => {
        const form = new Dendriform('hi');

        const {result} = renderHook(() => useInput(form));
        expect(result.current.value).toBe('hi');

        const firstCallback = result.current.onChange;

        act(() => {
            const event = {
                target: {
                    value: 'hello'
                }
            } as ChangeEvent<HTMLInputElement|HTMLSelectElement>;

            result.current.onChange(event);
        });

        // the same callback should be provided even after hook update
        expect(result.current.onChange).toBe(firstCallback);

        // useInput's state should have changed,
        // but the change should not have propagated anywhere yet
        expect(result.current.value).toBe('hello');
        expect(form.value).toBe('hi');

        // flush buffer, allow setTimeouts to run, and re-test
        act(() => {
            jest.advanceTimersByTime(10);
        });

        expect(result.current.value).toBe('hello');
        expect(form.value).toBe('hello');

    });

    test(`should debounce`, () => {
        const form = new Dendriform('hi');

        const {result} = renderHook(() => useInput(form, 100));
        expect(result.current.value).toBe('hi');

        act(() => {
            const event = {
                target: {
                    value: 'hello'
                }
            } as ChangeEvent<HTMLInputElement|HTMLSelectElement>;

            result.current.onChange(event);

            jest.advanceTimersByTime(10);
        });

        // useInput's state should have changed,
        // but the change should not have propagated anywhere yet
        expect(result.current.value).toBe('hello');
        expect(form.value).toBe('hi');

        // change the value again
        act(() => {
            const event = {
                target: {
                    value: 'hello!'
                }
            } as ChangeEvent<HTMLInputElement|HTMLSelectElement>;

            result.current.onChange(event);

            jest.advanceTimersByTime(10);
        });

        // useInput's state should have changed,
        // but the change should not have propagated anywhere yet
        expect(result.current.value).toBe('hello!');
        expect(form.value).toBe('hi');

        // allow debounce period to lapse, should now have propagated
        act(() => {
            jest.advanceTimersByTime(110);
        });

        expect(result.current.value).toBe('hello!');
        expect(form.value).toBe('hello!');
    });

    test(`should turn falsey non-strings into empty strings`, () => {
        const form = new Dendriform(null);

        const hook1 = renderHook(() => useInput(form));
        expect(hook1.result.current.value).toBe('');
    });

});
