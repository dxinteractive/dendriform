---
id: store
title: Stores
---

Stores are used to request and cache data. Each store contains a collection of items of the same type, where each item is referred to by a particular set of `args`.

Some examples:

- A `userStore` may contain several `User` objects, each referred to by their `id` string

- A `postOfficeStore` may contain several `PostOffice` class instances, each referred to by their `postcode` string

- A `petListStore` may contain several `Pet[]` arrays, each referred to by their owner's `id` string

- A `userListStore` may contain several `User[]` arrays, each referred to by a search parameters object `{keyword: string, sort: string}`


```typescript
import {Store} from 'dendriform';

const userStore = new Store<string,User,Error>({
    name: 'User Store',
    staleTime: 30 // after 30 seconds, the item is eligible to be requested again
    request: // ...fetchUser
});

const postOfficeStore = new Store<string,PostOffice,Error>({
    name: 'Post Office Store',
    request: // ...fetchPostOffice
});

const petListStore = new Store<string,Pet[],Error>({
    name: 'Pet List Store',
    request: // ...fetchPetList
});

const userListStore = new Store<SearchParams,User[],Error>({
    name: 'User List Store',
    request: // ...fetchUserList
});
```

## Getting data

You use a store by calling methods to access its contents, and the store will handle whether the data needs to be requested from somewhere like a server, or simply returned from the cache. Items cached in the store can be configured to become stale after a period of time, and if an stale item is retrieved from the store, then it should be requested from the server again.

Methods to use include [get()](#storeget), [read()](#storeread), [request()](#storerequest), and the React hooks [useGet()](#storeuseget) and [useBatchGet()](#storeusebatchget).

## Requests

When a store needs to return data that it doesn't have yet, it makes a request. You can pass request functions into each store when you instantiate them. It's common for these requests to make XHR requests to a server.

### asyncRequest

The `asyncRequest` helper lets you return a promise with data.

```typescript
import {Store, asyncRequest} from 'dendriform';

type ID = string;

const userStore = new Store<ID,User,Error>({
    name: 'User Store',
    request: asyncRequest(async (id: ID): User => {
        const response = await fetch(`http://example.com/user/${id}`)
        return new User(await response.json());
    })
});
```

When a request is fired, the corresponding `StoreItem` has the following attributes set:
- `loading: true`

If the promise is resolved, the corresponding `StoreItem` has the following attributes set:
- `loading: false`
- `data: value in the promise`
- `hasData: true`
- `error: undefined`
- `hasError: false`

If the promise is rejected, the corresponding `StoreItem` has the following attributes set:
- `loading: false`
- `error: value in the promise`
- `hasError: true`

Please keep in mind that **asyncRequest has limitations**. It fires once for each piece of data that you need. This is fine if you don't need to make many requests, but `dendriform` is designed to let your components ask for data whenever they need it. If you happen to render a large number of components then you can easily end up with a large number of `asyncRequest` calls, all in a short burst. To combat this we need buffering and batching.

### rxRequest

To be used with [RxJS](https://rxjs-dev.firebaseapp.com/), the `rxRequest` function lets you turn the series of requests fired by a store into an Rx observable, after which buffering and batching is easy to do with `rxBatch`. With this setup you can the most out of `dendriform`'s design - when items can be requested in batches, then your data will fall into place incrementally as each batch of items is returned.

Read more about [rxRequest and rxBatch](rxjs.md).

If you would like buffering and batching but *don't* want to use RxJS, [drop a comment in this issue](https://github.com/92green/dendriform/issues/11).


## Setting data

Usually most setting will be done by your request functions, but you can also set items directly if you need to.

Methods to use include [receive()](#storereceive), [setLoading()](#storesetloading), [setData()](#storesetdata) and [setError()](#storeseterror).

-----


## Sending mutations to the server (saving)

So far we've only spoken about loading data from server to client. While that may be a more common action to want to perform on a client, sending data to the server is obviously important too.

Here you can choose if you want to use a `dendriform` store, or if you just call your request function directly. The data returned from saving is often of much less long-term importance compared to loading so you may find it unnecessary to want to store that for later. However there are a few advantages to using a `dendriform` store for sending mutations:

- Using a store means you can subscribe to the changes in the request state of the returned `StoreItem`, which is especially useful if you're want your UI to react to those changes using Mobx, React etc.
- Your app's code has a consistent pattern for interacting with requests, regardless of whether it is loading or saving. 

When using a store, there is nothing special about sending mutations or "saving" data. On your new store, `args` would be the data you want to send, and the `data` in the store can be whatever you want to keep from the response of the mutation. The `data` does not have to be the same type as `args`, and it could simply be `null` if the mutation doesn't return anything of use to the client. 

For example you may have a store for creating users.

```typescript
const userCreateStore = new Store<User,null,Error>({
    name: 'User Create Store',
    request: asyncRequest(async (user: User): null => {
        await fetch(`http://example.com/user/create`, {
            method: 'POST',
            body: JSON.stringify(user));
        });
        return null;
    }
});
```

You could then create a user by calling `request` on the store.

```typescript
let user = new User('new guy');
const userCreateFromStore = await userCreateStore.request(user).promise();

if(userCreateFromStore.hasError) {
    console.error(`Error:`, userCreateFromStore.error.message);
} else {
    console.log(`Success`);
}
```

Also see how to [send mutations with React](react.md#saving-an-item).

---

## API

### new Store()

```typescript
const store = new Store<A,D,E,AA>({
    name?: string;
    request?: (store: Store<A,D,E,AA>) => void;
    staleTime?: number;
    log?: (...args: any[]) => void;
});
```

#### name

A name for the store. Mainly for developer reference, but also used by [log()](#log). Defaults to `'unnamed'`.

#### request

A request function, such as [asyncRequest](#asyncrequest). Defaults to a no-op.

#### staleTime

Determines the default duration for how long an item should be held in cache before it's eligible to be requested again.

- `staleTime: 30` - after 30 seconds, the item is eligible to be requested again
- `staleTime: 0` - the item should always be requested fresh
- `staleTime: -1` - the item should never be requested again

#### log

A logging function for debugging.

```typescript
const userStore = new Store({
    name: 'User Store',
    request: // ...
    log: console.log // example logger
});
```

### Store Types

```typescript
const store = new Store<A,D,E,AA>();
```

#### A: Args

Args can be of any `JSON.stringify`-able data type. It cannot be `undefined`.

Args are `JSON.stringify`-ed and used as keys to refer to each item in the store.

#### D: Data

Data can be any data type other than `undefined`.

When choosing your data type, choose a type that you'll want to use throughout your app. Sometimes the data returned from the server needs some processing or needs to be turned into class instances, such as the `User` class in some of the examples on this page; in these cases your `request` function should prepare your data so that `User` instances are collected in the store, as seen in the [asyncRequest example](#asyncrequest).

#### E: Error

Error can be of any type other than `undefined`.

This is the data shape you want your errors to be.

#### AA: Alias

Aliases let you easily refer to specific items by an alternative identifier other than `args`. A single alias may refer to different items over time, but only ever one at a time. Defaults to `string`.

### store.get()

```typescript
// signature
store.get(args: A?, options?: {}) => StoreItem

// usage
const userFromStore = userStore.get('a');
const user = userFromStore.data;
```

The `get()` method returns a `StoreItem`. If there is no item corresponding to `args` or if the item is stale, the `get()` method will request the data.

All attributes on a `StoreItem` are [mobx observables](https://mobx.js.org/refguide/observable.html), so mobx can trigger downstream updates once new data arrives.

```typescript
const userFromStore = await userStore.get('a'); 

autorun(() => {
    console.log('User A name changed:', userFromStore.name);
});
```

You can also turn the `StoreItem` into a `Promise` and await the result. Note that the promise never rejects - even if the request encounters an error, the promise always resolves.

```typescript
const userFromStore = await userStore.get('a').promise();
```

You can also turn the `StoreItem` into a tuple to access and name `StoreItem`'s data with a one-liner.

```typescript
const [user, userFromStore] = await userStore.get('a').tuple();
```

- A `StoreItem` is always returned, even if no request has been made and no data exists yet. If no item matches the alias, then a blank `StoreItem` is returned.
- If `undefined` is passed as the first argument, no request will take place.
- The optional `options` object can contain `staleTime: number` to use a different stale time than the Store's default time. For example `{staleTime: 0}` can be used to always force a new request.
- The optional `options` object can contain `alias: AA`. This creates an alias for the current `args` that can be looked up via [readAlias()](#storereadalias)

If you are using React, you should consider using the [store.useGet()](#storeuseget) hook.

### store.read()

```typescript
// signature
store.read(args: A?) => StoreItem

// usage
const userFromStore = userStore.read('a');
```

The `read()` method returns a `StoreItem`. It is similar to [get()](#storeget), except it will only return data from cache and never fire a request.

### store.readAlias()

```typescript
// signature
store.readAlias(alias: AA) => StoreItem

// usage
const userFromStore = userStore.readAlias('alias');
```

Aliases let you easily refer to specific items by an alternative identifier other than `args`. A single alias may refer to different items over time, but only ever one at a time. The `readAlias()` method returns the `StoreItem` associated with the alias provided. If no item matches the alias, then a blank `StoreItem` is returned. It is similar to [read()](#storeread).


### store.request()

```typescript
// signature
store.request(args: A?, options?: {}) => StoreItem

// usage
const userFromStore = store.request('a');
```

The `request()` method always immediately requests the data.

- It immediately sets the corresponding `StoreItem` to `loading: true`.
- The optional `options` object can contain `alias: AA`. This creates an alias for the current `args` that can be looked up via [readAlias()](#storereadalias)

### store.useGet()

```typescript
// signature
store.useGet(args: A?, options?: {}) => StoreItem

// usage
const MyComponent = (props) => {
    const userFromStore = userStore.useGet(props.id);
};
```

The `useGet()` method is a React hook very similar to [get()](#storeget), except it uses a `useEffect` hook internally to make sure that side-effects are not fired during React's render phase.

- If `undefined` is passed as the first argument, no request will take place.
- The optional `options` object can contain `staleTime: number` to use a different stale time than the Store's default time. For example `{staleTime: 0}` can be used to always force a new request.
- The optional `options` object can contain `alias: AA`. This creates an alias for the current `args` that can be looked up via [readAlias()](#storereadalias)
- The optional `options` object can contain `dependencies: any[]` which are passed to the internal `useEffect` hook. If any dependencies change, `get()` will be called again with the current `args`.

### store.useBatchGet()

```typescript
// signature
store.useBatchGet(argsArray: A[]?, options?: {}) => StoreItem[]

// usage
const MyComponent = (props) => {
    const usersFromStore = userStore.useBatchGet(props.idArray);
};
```

The `useBatchGet()` method is a React hook very similar to [useGet()](#storeuseget), except it allows you to get an arbitrary and variable amount of items.

- If `undefined` is passed as the first argument, no request will take place.
- The optional `options` object can contain `staleTime: number` to use a different stale time than the Store's default time. For example `{staleTime: 0}` can be used to always force a new request.
- The optional `options` object can contain `alias: AA`. This creates an alias for the current `args` that can be looked up via [readAlias()](#storereadalias)
- The optional `options` object can contain `dependencies: any[]` which are passed to the internal `useEffect` hook. If any dependencies change, `get()` will be called again with the current `args`.

### store.setLoading()

```typescript
// signature
store.setLoading(args: A, loading: boolean) => void

// usage
store.setLoading('a', true);
```

Sets the `loading` status of the `StoreItem` corresponding to `args`.

You'll very rarely need to call this directly if you are using premade request functions like [asyncRequest()](#asyncrequest).

### store.setData()

```typescript
// signature
store.setData(args: A, data?: D) => void

// usage
store.setData('a', new User());
```

Sets the `data` of the `StoreItem` corresponding to `args`.

When called, the corresponding `StoreItem` has the following attributes set:
- `loading: false`
- `data: data`
- `hasData: true`
- `error: undefined`
- `hasError: false`

You'll very rarely need to call this directly if you are using premade request functions like [asyncRequest()](#asyncrequest).

- If `data` is `undefined`, the `StoreItem` is removed.

### store.setError()

```typescript
// signature
store.setError(args: A, error: E) => void

// usage
store.setError('a', new Error());
```

Sets the `error` of the `StoreItem` corresponding to `args`.

If the promise is rejected, the corresponding `StoreItem` has the following attributes set:
- `loading: false`
- `error: error`
- `hasError: true`

You'll very rarely need to call this directly if you are using premade request functions like [asyncRequest()](#asyncrequest).

### store.receive()

```typescript
// signature
store.receive(receive: {args: A, data: D?}|{args: A, error: E}) => void

// usage
store.receive({args: 'a', data: new User()});
store.receive({args: 'a', error: new Error()});
```

A short way of calling [setData](#storesetdata) or [setError](#storeseterror).

You'll very rarely need to call this directly if you are using premade request functions like [asyncRequest()](#asyncrequest).

### store.remove()

```typescript
// signature
store.remove(args: A) => void

// usage
store.remove('a');
```

Removes the `StoreItem` corresponding to `args` if it exists.

### store.removeByAlias()

```typescript
// signature
store.removeByAlias(alias: AA) => void

// usage
store.removeByAlias('alias');
```

Removes the `StoreItem` corresponding to `alias` if it exists.
