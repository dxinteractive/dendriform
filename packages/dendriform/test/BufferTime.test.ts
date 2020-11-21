import {BufferTime} from '../src/index';

jest.useFakeTimers();

describe(`BufferTime`, () => {
    test(`should push and callback`, () => {
        const callback = jest.fn();
        const bufferTime = new BufferTime<number>(callback);
        bufferTime.time = 1000;

        bufferTime.push(1);
        expect(callback).toHaveBeenCalledTimes(0);

        bufferTime.push(2);
        expect(callback).toHaveBeenCalledTimes(0);

        jest.advanceTimersByTime(500);
        expect(callback).toHaveBeenCalledTimes(0);

        jest.advanceTimersByTime(1000);

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0][0]).toEqual([1,2]);
    });
});
