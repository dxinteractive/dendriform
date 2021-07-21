import {useProps, Dendriform} from '../src/index';
import {renderHook, act} from '@testing-library/react-hooks';

jest.useFakeTimers();

describe(`useProps`, () => {

    test(`should provide value and onChange`, () => {
        const form = new Dendriform('hi');

        const {result} = renderHook(() => useProps(form));
        expect(result.current.value).toBe('hi');

        const firstCallback = result.current.onChange;

        act(() => {
            result.current.onChange('hello');
        });

        // the same callback should be provided even after hook update
        expect(result.current.onChange).toBe(firstCallback);
        expect(result.current.value).toBe('hello');
        expect(form.value).toBe('hello');

    });

    test(`should debounce`, () => {
        const form = new Dendriform('hi');

        const {result} = renderHook(() => useProps(form, 100));
        expect(result.current.value).toBe('hi');

        act(() => {
            result.current.onChange('hello');
            jest.advanceTimersByTime(10);
        });

        // useProps's state should have changed,
        // but the change should not have propagated anywhere yet
        expect(result.current.value).toBe('hello');
        expect(form.value).toBe('hi');

        // change the value again
        act(() => {
            result.current.onChange('hello!');
            jest.advanceTimersByTime(10);
        });

        // useProps's state should have changed,
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

});
