import {useCallback} from 'react';
import type {Dendriform} from './Dendriform';

type UseCheckboxResult = {
    checked: boolean,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
};

export const useCheckbox = <V extends boolean,C>(form: Dendriform<V,C>): UseCheckboxResult => {
    const [checked, produceChecked] = form.useValue();

    const onChange = useCallback(event => {
        produceChecked(event.target.checked);
    }, []);

    return {
        checked,
        onChange
    };
};
