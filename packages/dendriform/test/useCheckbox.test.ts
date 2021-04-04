import {useCheckbox, Dendriform} from '../src/index';
import {renderHook, act} from '@testing-library/react-hooks';
import type {ChangeEvent} from 'react';

describe(`useCheckbox`, () => {

    test(`should adapt form to fit checkbox props`, () => {
        const form = new Dendriform(true);

        const {result} = renderHook(() => useCheckbox(form));
        expect(result.current.checked).toBe(true);

        const firstCallback = result.current.onChange;

        act(() => {
            const event = {
                target: {
                    checked: false
                }
            } as ChangeEvent<HTMLInputElement>;

            result.current.onChange(event);
        });

        // the same callback should be provided even after hook update
        expect(result.current.onChange).toBe(firstCallback);

        // useCheckbox's state should have changed,
        // and the change should have propagated
        expect(result.current.checked).toBe(false);
        expect(form.value).toBe(false);
    });

});
