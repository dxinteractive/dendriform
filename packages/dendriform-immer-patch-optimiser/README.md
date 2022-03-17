# dendriform-immer-patch-optimiser

[Dendriform](https://github.com/dxinteractive/dendriform) uses [Immer](https://github.com/immerjs/immer). Immer is wonderful, especially its ability to produce [patches](https://immerjs.github.io/immer/docs/patches) for implementing concurrent editing and undo & redo functionality.

But Dendriform needs to track how array elements are moved around. Luckily the RFC6902 JSON patch standard that Immer's patches are similar to describes ["move" operations](https://tools.ietf.org/html/rfc6902#section-4.4). Immer does not produce "move" patches, so this plugin post-processes Immer patches to infer array element movement and produce "move" patches.

When using Immer alone, certain types of changes [can lead to a large number of patches](https://github.com/immerjs/immer/issues/642) because Immer's design [optimises for good performance at generation time](https://github.com/immerjs/immer/issues/642#issuecomment-660086462). A nice side effect of this library is that describing movements naturally reduces the number of patches.

Please note that while this library does some immer patch optimisations that could be used in any project, **the main goal of this library is to solve problems for [Dendriform](https://github.com/dxinteractive/dendriform)**. As such, it's API may be a little volatile, and it won't necessarily aim to please the use cases of the general public. You are welcome to use the library as is, copy the source code for your own uses, or even republish the code as a new library if you'd like to take on the responsibility of maintaining a more public-serving variant of it.

### Current limitations

- Is not yet guaranteed to work with arrays containing multiple identical (strictly-equal) elements

## Examples

### Array optimisation

```js
import {produceWithPatches} from 'immer';
import {optimise} from 'dendriform-immer-patch-optimiser';

// enablePatches() is already called by dendriform-immer-patch-optimiser

const base = {foo: ['a','b','c']};
const [result, recordedPatches] = produceWithPatches(base, draft => {
    draft.foo.unshift('d');
});

// result:
// ['d','a','b','c']

// recordedPatches:
// {op: 'replace', path: ['foo', 0], value: 'd'},
// {op: 'replace', path: ['foo', 1], value: 'a'},
// {op: 'replace', path: ['foo', 2], value: 'b'},
// {op: 'add', path: ['foo', 3], value: 'c'}

const optimisedPatches = optimise(base, recordedPatches);

// optimisedPatches:
// {op: 'add', path: ['foo', 0], value: 'd'}
```

### Move patches

```js
import {produceWithPatches} from 'immer';
import {optimise, applyPatches} from 'dendriform-immer-patch-optimiser';

// enablePatches() is already called by dendriform-immer-patch-optimiser

const base = {foo: ['a','b','c']};
const [result, recordedPatches] = produceWithPatches(base, draft => {
    draft.foo.shift();
});

// result:
// ['b','c']

// recordedPatches:
// {op: 'replace', path: ['foo', 0], value: 'b'},
// {op: 'replace', path: ['foo', 1], value: 'c'},
// {op: 'replace', path: ['foo', 'length'], value: 2}

const optimisedPatches = optimise(base, recordedPatches);

// optimisedPatches:
// {op: 'move', from: ['foo', 1], path: ['foo', 0]},
// {op: 'move', from: ['foo', 2], path: ['foo', 1]},
// {op: 'replace', path: ['foo', 'length'], value: 2}

// Immer doesn't understand "move" patches, so use applyPatches() exported from dendriform-immer-patch-optimiser

const result2 = applyPatches(base, optimisedPatches);

// result2 is the same as result
```

### Adding, moving and removing at once

```js
import {produceWithPatches} from 'immer';
import {optimise, applyPatches} from 'dendriform-immer-patch-optimiser';

// enablePatches() is already called by dendriform-immer-patch-optimiser

const base = ['a','b','X','Y','c','d','e','Z'];
const [result, recordedPatches] = produceWithPatches(base, draft => {
    draft.splice(2,2);
    draft.pop();
    draft.reverse();
    draft.push('C');
    draft.splice(3, 0, 'B');
    draft.unshift('A');
});

// result:
// ['A','e','d','c','B','b','a','C']

// recordedPatches:
// {op: 'replace', path: [0], value: 'A'},
// {op: 'replace', path: [1], value: 'e'},
// {op: 'replace', path: [2], value: 'd'},
// {op: 'replace', path: [3], value: 'c'},
// {op: 'replace', path: [4], value: 'B'},
// {op: 'replace', path: [5], value: 'b'},
// {op: 'replace', path: [6], value: 'a'},
// {op: 'replace', path: [7], value: 'C'}

const optimisedPatches = optimise(base, recordedPatches);

// optimisedPatches:
// {op: 'move', from: [6], path: [0]},
// {op: 'move', from: [6], path: [1]},
// {op: 'move', from: [6], path: [2]},
// {op: 'move', from: [4], path: [3]},
// {op: 'replace', path: ['length'], value: 5},
// {op: 'add', path: [0], value: 'A'},
// {op: 'add', path: [4], value: 'B'},
// {op: 'add', path: [7], value: 'C'}

// Immer doesn't understand "move" patches, so use applyPatches() exported from dendriform-immer-patch-optimiser

const result2 = applyPatches(base, optimisedPatches);

// result2 is the same as result
```
