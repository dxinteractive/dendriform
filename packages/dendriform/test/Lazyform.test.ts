import {Dendriform, Lazyform/*, useLazyform*/} from '../src/index';
// import {renderHook, act} from '@testing-library/react-hooks';

describe(`Lazyform`, () => {

    test(`should subscribe and create SYNC value when async value is accessed`, () => {
        const form1 = new Dendriform(1);
        const form2 = new Dendriform(1);

        const valueGetter = jest.fn(() => {
            return form1.value + form2.value;
        });

        const lazyform = new Lazyform(valueGetter, [form1, form2]);

        expect(valueGetter).toHaveBeenCalledTimes(0);
        expect(lazyform.status.value.pending).toBe(false);
        expect(lazyform.status.value.complete).toBe(false);

        expect(lazyform.value).toBe(2);
        expect(valueGetter).toHaveBeenCalledTimes(1);
        expect(lazyform.status.value.pending).toBe(false);
        expect(lazyform.status.value.complete).toBe(true);

        // should get second derivation from cache

        const result2 = lazyform.value;

        expect(result2).toBe(2);
        expect(valueGetter).toHaveBeenCalledTimes(1);
    });

    test(`should subscribe and create ASYNC value when .value is accessed`, async () => {
        const form1 = new Dendriform(1);
        const form2 = new Dendriform(1);

        const valueGetter = jest.fn(async () => {
            return form1.value + form2.value;
        });

        const lazyform = new Lazyform(valueGetter, [form1, form2]);

        expect(lazyform.status.value.pending).toBe(false);
        expect(lazyform.status.value.complete).toBe(false);

        // access value
        expect(lazyform.value).toBe(undefined);
        expect(lazyform.status.value.pending).toBe(true);
        expect(lazyform.status.value.complete).toBe(false);

        const result = await lazyform.lazyValue;

        expect(lazyform.status.value.pending).toBe(false);
        expect(lazyform.status.value.complete).toBe(true);
        expect(lazyform.value).toBe(2);
        expect(result).toBe(2);
        expect(valueGetter).toHaveBeenCalledTimes(1);
    });

    test(`should subscribe and create ASYNC value when .lazyValue is accessed`, async () => {
        const form1 = new Dendriform(1);
        const form2 = new Dendriform(1);

        const valueGetter = jest.fn(async () => {
            return form1.value + form2.value;
        });

        const lazyform = new Lazyform(valueGetter, [form1, form2]);

        expect(lazyform.status.value.pending).toBe(false);
        expect(lazyform.status.value.complete).toBe(false);

        const promise = lazyform.lazyValue;

        expect(lazyform.status.value.pending).toBe(true);
        expect(lazyform.status.value.complete).toBe(false);
        expect(lazyform.value).toBe(undefined);

        const result = await promise;

        expect(lazyform.status.value.pending).toBe(false);
        expect(lazyform.status.value.complete).toBe(true);
        expect(lazyform.value).toBe(2);
        expect(result).toBe(2);
        expect(valueGetter).toHaveBeenCalledTimes(1);

        // should get second derivation from cache

        const result2 = await lazyform.value;

        expect(result2).toBe(2);
        expect(valueGetter).toHaveBeenCalledTimes(1);
    });

    test(`should reevaluate from Dendriform SYNC dependency changing`, () => {
        const form1 = new Dendriform(1);
        const form2 = new Dendriform(1);

        const valueGetter = jest.fn(() => {
            return form1.value + form2.value;
        });

        const lazyform = new Lazyform(valueGetter, [form1, form2]);

        expect(lazyform.value).toBe(2);
        expect(valueGetter).toHaveBeenCalledTimes(1);

        form1.set(3);
        expect(lazyform.status.value.complete).toBe(false);

        expect(lazyform.value).toBe(4);
        expect(valueGetter).toHaveBeenCalledTimes(2);
        expect(lazyform.status.value.complete).toBe(true);
    });

    test.only(`should reevaluate from Lazyform SYNC dependency changing`, () => {
        const form1 = new Dendriform(1);

        const valueGetter1 = jest.fn(() => {
            return form1.value * 10;
        });

        const lazyform1 = new Lazyform<number>(valueGetter1, [form1]);

        expect(valueGetter1).toHaveBeenCalledTimes(0);

        const valueGetter2 = jest.fn(() => {
            console.log('!!');
            return (lazyform1.value ?? 0) * 10;
        });

        const lazyform2 = new Lazyform<number>(valueGetter2, [lazyform1]);

        expect(valueGetter1).toHaveBeenCalledTimes(0);
        expect(valueGetter2).toHaveBeenCalledTimes(0);

        const result = lazyform2.value;

        expect(result).toBe(100);
        expect(valueGetter1).toHaveBeenCalledTimes(1);
        expect(valueGetter2).toHaveBeenCalledTimes(1);

        console.log('....');

        form1.set(2);
        /*const result2 = */lazyform2.value;
        // expect(result2).toBe(200);
        expect(valueGetter1).toHaveBeenCalledTimes(2);
        expect(valueGetter2).toHaveBeenCalledTimes(2);
        
    });

    /*test(`should useValue and always re-derive while mounted`, async () => {

        const form = new Dendriform(1);

        const lazyform = new Lazyform<number>(async () => {
            return form.value * 10;
        }, [form]);

        const hook = renderHook(() => lazyform.useValue());
        expect(hook.result.current).toBe(undefined);
        expect(lazyform.status.value.pending).toBe(true);

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(hook.result.current).toBe(10);

        act(() => {
            form.set(2);
        });

        expect(hook.result.current).toBe(undefined);
        expect(lazyform.status.value.pending).toBe(true);

        await act(async () => {
            await Promise.resolve();
        });

        expect(hook.result.current).toBe(20);

        hook.unmount();

        act(() => {
            form.set(3);
        });

        expect(lazyform.status.value.pending).toBe(false);
    });

    test(`should useValue and fallback to last value if instructed`, async () => {

        const form = new Dendriform(1);

        const lazyform = new Lazyform<number>(async () => {
            return form.value * 10;
        }, [form]);

        const hook = renderHook(() => lazyform.useValue(true));
        expect(hook.result.current).toBe(undefined);
        expect(lazyform.status.value.pending).toBe(true);

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(hook.result.current).toBe(10);
        expect(lazyform.value).toBe(10);
        expect(lazyform.lastValue).toBe(10);

        act(() => {
            form.set(2);
        });

        expect(lazyform.status.value.pending).toBe(true);
        expect(lazyform.value).toBe(undefined);
        expect(lazyform.lastValue).toBe(10);
        expect(hook.result.current).toBe(10);

        await act(async () => {
            await Promise.resolve();
        });

        expect(hook.result.current).toBe(20);
        expect(lazyform.value).toBe(20);
        expect(lazyform.lastValue).toBe(20);
    });

    test(`useLazyform should provide a Lazyform`, async () => {

        const form = new Dendriform(1);

        const hook = renderHook(() => useLazyform(async () => form.value * 10, [form]));
        const instance = hook.result.current;
        expect(instance instanceof Lazyform).toBe(true);
        expect(await instance.value).toBe(10);

        hook.rerender();

        expect(hook.result.current).toBe(instance);

        hook.unmount();


    });*/
});
