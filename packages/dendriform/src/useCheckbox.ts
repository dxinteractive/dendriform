import {useCallback} from 'react';
import type {Dendriform, Plugins} from './Dendriform';

type UseCheckboxResult = {
    checked: boolean,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
};

export const useCheckbox = <V extends boolean, P extends Plugins>(form: Dendriform<V,P>): UseCheckboxResult => {
    const checked = form.useValue();

    const onChange = useCallback(event => {
        form.set(event.target.checked);
    }, []);

    return {
        checked,
        onChange
    };
};
