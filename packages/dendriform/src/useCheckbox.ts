import {useCallback} from 'react';
import type {Dendriform} from './Dendriform';

type UseCheckboxResult = {
    checked: boolean,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
};

export const useCheckbox = <V extends boolean>(form: Dendriform<V>): UseCheckboxResult => {
    const checked = form.useValue();

    const onChange = useCallback(event => {
        form.set(event.target.checked);
    }, []);

    return {
        checked,
        onChange
    };
};
