---
id: react
title: Usage with React
---

## Loading an item

Loading an item is straightforward.

1. Wrap your component in a [mobx observer HoC](https://mobx.js.org/refguide/observer-component.html).
2. Import the relevant [Store](store.md) instance.
3. Use the [useGet()](store.md#storeuseget) hook.

```jsx
import {observer} from 'mobx-react';

const UserView = observer(props => {
    const userFromStore = userStore.useGet(props.userId);
    const user = userFromStore.data;

    if(!userFromStore) return null;
    if(userFromStore.loading) return <div>Loading</div>;
    if(userFromStore.hasError) return <div>Error: {userFromStore.error.message}</div>;
    if(!userFromStore.hasData) return <div>Not found</div>;

    return <div>User's name: {user.name}</div>;
});
```

Initially `userFromStore.data` will be `undefined` until the user data is loaded.

In the above example, if `props.userId` changes then the item corresponding to `props.userId`'s new value will be gotten.

### Improvement 1 - Loader Component

Create a component to handle your loading states, and reuse it around your app. An example might be something like this:

```jsx
const UserView = observer(props => {
    const userFromStore = userStore.useGet(props.userId);
    const user = userFromStore.data;

    return <Loader storeItem={userFromStore}>
        {() => <div>User's name: {user.name}</div>}
    </Loader>;
});

// handle request state as you like
// for example, a component using render props

const Loader = observer(props => {
    let {storeItem, children} = props;
    if(storeItem.loading) return <div>Loading</div>;
    if(storeItem.hasError) return <div>Error: {storeItem.error.message}</div>;
    if(!storeItem.hasData) return null;
    return children();
});
```

### Improvement 2 - StoreItem.tuple()

You'll often want to get `StoreItem.data` and assign it to a variable. Use `StoreItem.tuple()` to turn your data access into a one-liner:

```jsx
const UserView = observer(props => {
    const [user, userFromStore] = userStore.useGet(props.userId).tuple();

    return <Loader storeItem={userFromStore}>
        {() => <div>User's name: {user.name}</div>}
    </Loader>;
});
```

## Loading a list of items

Loading a list of items based on some search parameters can be done just the same as loading a single item. Remember that [each item in a store can be an array](store.md), they don't have to be treated in a special way.

```jsx
const UserListView = observer(props => {
    const [keyword, setKeyword] = useState('');
    const changeKeyword = useCallback(event => setKeyword(event.target.value) []);

    const params = keyword !== '' ? {keyword} : undefined;
    // ^ pass undefined to useGet() to request no results

    const [userList, userListFromStore] = userListStore.useGet(params).tuple();

    return <div>
        <input value={keyword} onChange={changeKeyword} />

        <Loader storeItem={userListFromStore}>
            {() => <div>
                {userList.map(user => <div key={user.id}>{user.name}</div>)}
            </div>}
        </Loader>
    </div>;
});
```

## Loading several items by ids

Loading several items can be done easily by rendering several components, where each component is passed the relevant `args` and gets its own data.

```jsx
// using UserView from the above examples

const UserGroupView = observer(props => {
    return props.userIdArray.map(userId => {
        return <UserView key={userId} userId={userId} />;
    });
});
```

If you need several items in a single component, use the [useBatchGet()](store.md#storeusebatchget) React hook.

```jsx
const UserView = observer(props => {
    const usersFromStore = userStore.useBatchGet(props.idArray);

    return usersFromStore.map((userFromStore, index) => {
        return <Loader key={index} storeItem={userFromStore}>
            {() => <div>User's name: {user.name}</div>}
        </Loader>
    });
});
```

## Saving an item

Sending mutations or "saving" can be quite a different to loading for a few reasons [discussed in greater detail here](store.md#sending-mutations-to-the-server-saving). When React is involved, another difference is that loading often happens as a result of components mounting or props changing, while saving often happens as a result of user interaction.

If you want to be able to have your UI react to the status of the request, you should create a store to handle sending the request.

Imagine we have this store:

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

You could write a React component to use the store like this:

```jsx
const UserCreateView = observer(props => {

    const createUser = useCallback(async () => {
        let user = new User(`new guy ${Math.random()}`);
        await userCreateStore.request(user).promise();
    }, []);

    return <div>
        <button onClick={createUser}>Create random user</button>
    </div>;
});
```

But there is a drawback - if you want React to display the status of the request, you'd have to create some local state in the component and keep it in sync. Considering `dendriform` `StoreItem`s are already keeping that state for you, it makes sense to just use the `StoreItem`s. You could write this if you want React to react to the request state changes.

```jsx
const UserCreateView = observer(props => {

    const createUser = useCallback(async () => {
        let user = new User(`new guy ${Math.random()}`);
        await userCreateStore.request(user, {alias: 'create'}).promise();
    }, []);

    const userCreateFromStore = userCreateStore.readAlias('create');

    return <div>
        <button onClick={createUser}>Create random user</button>
        <SavingStatus storeItem={userCreateFromStore} />
    </div>;
});

// handle request state as you like
// for example, a component that renders the request state as text

const SavingStatus = observer(props => {
    let {storeItem} = props;
    if(storeItem.loading) return <div>Saving</div>;
    if(storeItem.hasError) return <div>Error: {storeItem.error.message}</div>;
    if(!storeItem.hasData) return null;
    return <div>Saved</div>;
});
```

Notice how an [alias](store.md#storereadalias) is used so that the latest `StoreItem` can be read from the store without having to know the exact `args` that were used in the most recent request. If `createUser` is called a second time, the "create" alias will be assigned to the new `StoreItem`, and therefore that newer `StoreItem` will be returned from `userCreateStore.readAlias('create')`.

## Passing Stores around your app

It's a good idea to pass your stores via React context rather than importing them directly, because your components aren't tightly coupled to your stores, and are easier to write tests for.

### provideStores

The `provideStores` function creates a `StoreProvider` to provide a object containing your application's stores, and a `useStores` hook that can be used to access those stores from within components.

```typescript
import {Store, provideStores} from 'dendriform';

const userStore = new Store({...});
const petStore = new Store({...});

const [StoreProvider, useStores] = provideStores({
    userStore,
    petStore
});

export {StoreProvider, useStores};
```

```jsx
import React from 'react';
import {observer} from 'mobx-react';

export const App = (props) => {
    return <StoreProvider>
        <YourApp />
    </StoreProvider>;
};

// further down your component heirarchy...

const UserView = observer(props => {
    const {userStore} = useStores();
    const [user, userFromStore] = userStore.useGet(props.userId).tuple();

    // etc...
});
```

