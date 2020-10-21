---
id: rxjs
title: Usage with RxJS
---

[RxJS](https://rxjs-dev.firebaseapp.com/) is a library that allows you to write code that can easily reason about streams of events. It is fantastic for handling complex request behaviour, and makes it possible to quite easily implement [buffering and batching](store.md#rxrequest) as discussed on the Store page. 

While Mobx is also a "reactive" library with obeservers and observables, [they recommend RxJS for problems like this](https://mobx.js.org/faq/faq.html#when-to-use-rxjs-instead-of-mobx).

There are currently a couple of functions that `dendriform` gives you out of the box.

## rxRequest

The `rxRequest` function simply lets you use an Rx operator to handle a store's requests. It passes an Rx Observable with `args` as values, and expects to be returned an Rx Observable of objects of the following shape:

```typescript
export type Receive<A,D,E> = {
    args: A;
    data: D;
} | {
    args: A;
    error: E;
};
```

So either `{args: A, data: D}` or `{args: A, error: E}`, depending on if the item successfully retrieved data or not.

Here is an example that shows how someone might do time-based buffering and batching:

```typescript
import {Store, rxRequest} from 'dendriform';
import {of, from} from 'rxjs';
import {bufferTime, bufferCount, mergeMap, concatMap, catchError} from 'rxjs/operators';

const commentStore = new Store<string,Comment,Error>({
    name: 'Comment Store',
    request: rxRequest(obs => obs.pipe(
        // buffer requested args for 100ms second each
        bufferTime(100),
        // limit the number of items batched at once to 10
        mergeMap(argsArray => from(argsArray).pipe(
            bufferCount(10)
        )),
        // ask for arrays of comments
        concatMap(argsArray => {
            const ids = argsArray.join(',');
            const response = await fetch(`http://example.com/comments/${ids}`);
            return response.json();
        }),
        // convert results into the correct data shape
        mergeMap(comments => {
            return comments.map(comment => ({
                args: comment.id,
                data: new Comment(comment)
            }));
        }),
        // convert errors thrown from concatMap() into the correct data shape
        catchError(error => {
            return of(argsArray.map(args => ({args, error})));
        }),
        // turn the returned array values back into separate values
        mergeMap(items => from(items))
    ))
});
```

## rxBatch (experimental)

The `rxBatch` operator can do buffering and batching for you, including error handling due to failed requests or missing items.

*Please note that this function is very opinionated, and its API is potentially unstable. If this concerns you, then you are free to copy the source code for rxBatch.*

```typescript
const commentStore = new Store<string,Comment,Error>({
    name: 'Comment Store',
    request: rxRequest(
        rxBatch({
            request: argsArray => {
                const ids = argsArray.join(',');
                const response = await fetch(`http://example.com/comments/${ids}`);
                return response.json();
            },
            bufferTime: 100,
            batch: 10,
            getArgs: result => result.id,
            getData: result => result,
            requestError: error => error,
            missingError: () => new Error('not found')
        })
    )
});
```

```typescript
rxBatch<A,D,E,R>({
    request: (argsArray: A[]) => Observable<R[]>|Promise<R[]>,
    bufferTime: number,
    batch: number,
    getArgs: (result: R) => A,
    getData: (result: D) => A,
    requestError: (error: unknown, argsArray: A[]) => E,
    missingError: (args: A) => E
})
```

#### request

A function that will be called with an array of `args` each time a batch request should be executed. It should return either a promise or an observable whose value is an array of `result` objects. Results are a data structure of your choice that must contain the item's `args` and `data` somewhere within them - you'll use `getArgs` and `getData` to specify exactly which parts of each `result` are the `args` and `data`.

#### bufferTime

The amount of time to wait for the buffer to collect requests before acting on them, in milliseconds.

#### batch

The maximum amount of items to try and get with each `request`.

#### getArgs

A function used to extract the `args` from from the `result`.

#### getData

A function used to extract the `args` data from the `result`.

#### requestError

A function that can be used to shape errors into the type expected by the store.

#### missingError

A function that can be used to create an error for any items that should have been returned by the batch request but were not.


