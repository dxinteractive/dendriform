import {Dendriform, LazyDerive} from '../src/index';
import {renderHook, act} from '@testing-library/react-hooks';

describe(`LazyDerive`, () => {

    test(`should subscribe and derive when value is accessed`, async () => {
        const form1 = new Dendriform(1);
        const form2 = new Dendriform(1);

        const deriver = jest.fn(async () => {
            return form1.value + form2.value;
        });

        const lazyDerive = new LazyDerive(deriver, [form1, form2]);

        expect(lazyDerive.status.value.deriving).toBe(false);
        expect(lazyDerive.status.value.derived).toBe(false);
        expect(lazyDerive.currentValue).toBe(undefined);

        const promise = lazyDerive.value;

        expect(lazyDerive.status.value.deriving).toBe(true);
        expect(lazyDerive.status.value.derived).toBe(false);
        expect(lazyDerive.currentValue).toBe(undefined);

        const result = await promise;

        expect(lazyDerive.status.value.deriving).toBe(false);
        expect(lazyDerive.status.value.derived).toBe(true);
        expect(lazyDerive.currentValue).toBe(2);
        expect(result).toBe(2);
        expect(deriver).toHaveBeenCalledTimes(1);

        // should get second derivation from cache

        const result2 = await lazyDerive.value;

        expect(result2).toBe(2);
        expect(deriver).toHaveBeenCalledTimes(1);
    });

    test(`should clear cache explicitly`, async () => {
        const form1 = new Dendriform(1);
        const form2 = new Dendriform(1);

        const lazyDerive = new LazyDerive(async () => {
            return form1.value + form2.value;
        }, [form1, form2]);

        await lazyDerive.value;
        lazyDerive.clear();

        expect(lazyDerive.status.value.deriving).toBe(false);
        expect(lazyDerive.status.value.derived).toBe(false);
        expect(lazyDerive.currentValue).toBe(undefined);
    });

    test(`should unsubscribe`, async () => {
        const form1 = new Dendriform(1);
        const form2 = new Dendriform(1);

        const lazyDerive = new LazyDerive(async () => {
            return form1.value + form2.value;
        }, [form1, form2]);

        await lazyDerive.value;
        expect(lazyDerive.status.value.derived).toBe(true);

        lazyDerive.unsubscribe();
        form1.set(2);
        form2.set(2);
        expect(lazyDerive.status.value.derived).toBe(true);
    });

    test(`should clear cache from Dendriform dependency changing`, async () => {
        const form1 = new Dendriform(1);
        const form2 = new Dendriform(1);

        const lazyDerive = new LazyDerive(async () => {
            return form1.value + form2.value;
        }, [form1, form2]);

        await lazyDerive.value;
        form1.set(3);
        expect(lazyDerive.status.value.derived).toBe(false);
        expect(lazyDerive.currentValue).toBe(undefined);

        const result = await lazyDerive.value;

        expect(result).toBe(4);
        
    });

    test(`should clear cache from LazyDerive dependency changing`, async () => {
        const form1 = new Dendriform(1);

        const lazyDerive1 = new LazyDerive<number>(async () => {
            return form1.value * 10;
        }, [form1]);

        const lazyDerive2 = new LazyDerive<number>(async () => {
            return (await lazyDerive1.value) * 10;
        }, [lazyDerive1]);

        const result = await lazyDerive2.value;
        expect(result).toBe(100);

        form1.set(2);
        expect(lazyDerive1.status.value.derived).toBe(false);
        expect(lazyDerive1.currentValue).toBe(undefined);
        expect(lazyDerive2.status.value.derived).toBe(false);
        expect(lazyDerive2.currentValue).toBe(undefined);

        const result2 = await lazyDerive2.value;
        expect(result2).toBe(200);
        
    });

    test(`should useValue and always re-derive while mounted`, async () => {

        const form = new Dendriform(1);

        const lazyDerive = new LazyDerive<number>(async () => {
            return form.value * 10;
        }, [form]);

        const hook = renderHook(() => lazyDerive.useValue());
        expect(hook.result.current).toBe(undefined);
        expect(lazyDerive.status.value.deriving).toBe(true);

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
        expect(lazyDerive.status.value.deriving).toBe(true);

        await act(async () => {
            await Promise.resolve();
        });

        expect(hook.result.current).toBe(20);

        hook.unmount();

        act(() => {
            form.set(3);
        });

        expect(lazyDerive.status.value.deriving).toBe(false);
    });

    test(`should useValue and fallback to last value if instructed`, async () => {

        const form = new Dendriform(1);

        const lazyDerive = new LazyDerive<number>(async () => {
            return form.value * 10;
        }, [form]);

        const hook = renderHook(() => lazyDerive.useValue(true));
        expect(hook.result.current).toBe(undefined);
        expect(lazyDerive.status.value.deriving).toBe(true);

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(hook.result.current).toBe(10);
        expect(lazyDerive.currentValue).toBe(10);
        expect(lazyDerive.lastValue).toBe(10);

        act(() => {
            form.set(2);
        });

        expect(lazyDerive.status.value.deriving).toBe(true);
        expect(lazyDerive.currentValue).toBe(undefined);
        expect(lazyDerive.lastValue).toBe(10);
        expect(hook.result.current).toBe(10);

        await act(async () => {
            await Promise.resolve();
        });

        expect(hook.result.current).toBe(20);
        expect(lazyDerive.currentValue).toBe(20);
        expect(lazyDerive.lastValue).toBe(20);
    });
});
