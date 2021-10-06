import {Dendriform, PluginSubmit, diff} from '../../src/index';

type Val = {
    foo: number;
    bar?: number;
};

type Diffable = {
    [key: string]: number;
};

describe(`plugin submit`, () => {

    test(`should throw error if not initialised and submit() is called`, () => {

        const onSubmit = jest.fn();
        
        const plugins = {
            submit: new PluginSubmit({onSubmit})
        };

        expect(() => plugins.submit.submit()).toThrow('[Dendriform] Plugin must be passed into a Dendriform instance before this operation can be called');
    });

    test(`should submit value if changed`, () => {

        const value: Val = {
            foo: 123
        };

        const onSubmit = jest.fn();
        
        const plugins = {
            submit: new PluginSubmit({onSubmit})
        };

        const form = new Dendriform(value, {plugins});
        form.branch('foo').set(456);
        form.plugins.submit.submit();

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit.mock.calls[0][0]).toEqual({
            foo: 456
        });
    });
    
    test(`should change value and show previous and dirty at paths`, () => {

        const value: Val = {
            foo: 123,
            bar: 456
        };

        const onSubmit = jest.fn();
        
        const plugins = {
            submit: new PluginSubmit({onSubmit})
        };

        const form = new Dendriform(value, {plugins});

        expect(form.plugins.submit.dirty.value).toBe(false);
        expect(form.branch('foo').plugins.submit.dirty.value).toBe(false);
        expect(form.branch('bar').plugins.submit.dirty.value).toBe(false);

        form.branch('foo').set(456);

        expect(form.plugins.submit.previous.value).toEqual({foo: 123, bar: 456});
        expect(form.branch('foo').plugins.submit.previous.value).toBe(123);
        expect(form.plugins.submit.dirty.value).toBe(true);
        expect(form.branch('foo').plugins.submit.dirty.value).toBe(true);
        expect(form.branch('bar').plugins.submit.dirty.value).toBe(false);
    });

    test(`should not submit value if not changed - this behaviour may change in future`, () => {

        const value: Val = {
            foo: 123
        };

        const onSubmit = jest.fn();
        
        const plugins = {
            submit: new PluginSubmit({onSubmit})
        };

        const form = new Dendriform(value, {plugins});
        form.plugins.submit.submit();

        expect(onSubmit).toHaveBeenCalledTimes(0);
    });

    test(`should submit diffable changes`, () => {

        const value: Diffable = {
            foo: 100
        };

        const mockDiffed = jest.fn();
        
        const plugins = {
            submit: new PluginSubmit({
                onSubmit: (_newValue, details) => {
                    mockDiffed(diff(details));
                }
            })
        };

        const form = new Dendriform(value, {plugins});
        form.set(draft => {
            draft.bar = 200;
        });
        form.set(draft => {
            delete draft.foo;
        });

        form.plugins.submit.submit();

        expect(mockDiffed).toHaveBeenCalledTimes(1);
        expect(mockDiffed.mock.calls[0][0]).toEqual([
            [
                {
                    key: 'bar',
                    value: 200
                }
            ],
            [
                {
                    key: 'foo',
                    value: 100
                }
            ],
            []
        ]);
    });

    test(`should update previous state after successful submit`, () => {

        const value: Diffable = {
            foo: 100
        };

        const onSubmit = jest.fn();
        
        const plugins = {
            submit: new PluginSubmit({
                onSubmit
            })
        };

        const form = new Dendriform(value, {plugins});
        form.set(draft => {
            draft.bar = 200;
        });

        expect(form.plugins.submit.previous.value).toEqual({
            foo: 100
        });

        form.plugins.submit.submit();

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit.mock.calls[0][0]).toEqual({
            foo: 100,
            bar: 200
        });
        expect(onSubmit.mock.calls[0][1].prev.value).toEqual({
            foo: 100
        });

        expect(form.plugins.submit.previous.value).toEqual({
            foo: 100,
            bar: 200
        });

        form.set(draft => {
            delete draft.foo;
        });

        form.plugins.submit.submit();

        expect(onSubmit).toHaveBeenCalledTimes(2);
        expect(onSubmit.mock.calls[1][0]).toEqual({
            bar: 200
        });
        expect(onSubmit.mock.calls[1][1].prev.value).toEqual({
            foo: 100,
            bar: 200
        });

        expect(form.plugins.submit.previous.value).toEqual({
            bar: 200
        });
    });

    test(`should rollback and allow second attempt if onSubmit throws an error`, () => {

        const value: Diffable = {
            foo: 100
        };

        const mockSubmit = jest.fn();
        const onError = jest.fn(e => e.message);
        let called = 0;
        
        const plugins = {
            submit: new PluginSubmit({
                onSubmit: (newValue) => {
                    mockSubmit(newValue);
                    called++;
                    if(called === 1) {
                        throw new Error('!');
                    }
                },
                onError
            })
        };

        const form = new Dendriform(value, {plugins});
        form.set(draft => {
            draft.bar = 200;
        });

        form.plugins.submit.submit();

        // error should have occurred
        expect(mockSubmit.mock.calls[0][0]).toEqual({
            foo: 100,
            bar: 200
        });
        expect(onError).toHaveBeenCalledTimes(1);

        // error should contain error
        expect(form.plugins.submit.error.value).toBe('!');
        
        // previous should not be updated
        expect(form.plugins.submit.previous.value).toEqual({
            foo: 100
        });

        // try again, success should happen
        form.plugins.submit.submit();
        expect(mockSubmit).toHaveBeenCalledTimes(2);
        expect(mockSubmit.mock.calls[1][0]).toEqual({
            foo: 100,
            bar: 200
        });
        expect(onError).toHaveBeenCalledTimes(1);
        expect(form.plugins.submit.previous.value).toEqual({
            foo: 100,
            bar: 200
        });
        expect(form.plugins.submit.error.value).toBe(undefined);
    });

    test(`should use async onSubmit`, async () => {

        const value: Val[] = [
            {
                foo: 123
            }
        ];

        const mockDiffed = jest.fn();
        
        const plugins = {
            submit: new PluginSubmit({
                onSubmit: async (_newValue, details) => {
                    await Promise.resolve();
                    mockDiffed(diff(details));
                }
            })
        };

        const form = new Dendriform(value, {plugins});
        form.set(draft => {
            draft.push({
                foo: 456
            });
        });

        expect(form.plugins.submit.submitting.value).toBe(false);

        form.plugins.submit.submit();

        // async, so not called yet
        expect(mockDiffed).toHaveBeenCalledTimes(0);
        expect(form.plugins.submit.submitting.value).toBe(true);

        // resolve promises
        await Promise.resolve();
        await Promise.resolve();

        expect(mockDiffed).toHaveBeenCalledTimes(1);
        expect(mockDiffed.mock.calls[0][0][0].length).toBe(1);
        expect(form.plugins.submit.submitting.value).toBe(false);
    });

    test(`should use async onSubmit and reject`, async () => {

        const value: Val[] = [
            {
                foo: 123
            }
        ];

        const onError = jest.fn(() => '!!!');
        
        const plugins = {
            submit: new PluginSubmit({
                onSubmit: async () => {
                    throw new Error('!');
                },
                onError
            })
        };

        const form = new Dendriform(value, {plugins});
        form.set(draft => {
            draft.push({
                foo: 456
            });
        });


        form.plugins.submit.submit();
        await Promise.resolve();
        await Promise.resolve();

        expect(onError).toHaveBeenCalledTimes(1);
        expect(form.plugins.submit.error.value).toBe('!!!');
        expect(form.plugins.submit.submitting.value).toBe(false);
    });
});