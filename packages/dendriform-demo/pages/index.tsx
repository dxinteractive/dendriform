
import styled from 'styled-components';
import {Box, Flex, Wrapper, FloatZone} from '../components/Layout';
import {Text, H1, Link} from '../components/Text';

/*
import {space, color, layout, flexbox, position, border, compose, textStyle} from 'styled-system';
import {useRouter} from 'next/router';

const styledProps = compose(
    border,
    color,
    flexbox,
    layout,
    position,
    space,
    textStyle
);

export const Span = styled.span({}, styledProps);

export const Box = styled.div({display: 'block'}, styledProps);

export const Flex = styled.div({display: 'flex'}, styledProps);

export const Fixed = styled.div({position: 'fixed'}, styledProps);

export const Absolute = styled.div({position: 'absolute'}, styledProps);

//
// usage
//

import {useEffect, useState, useCallback} from 'react';
import {useDendriform, useInput, useCheckbox, array} from 'dendriform';
import {immerable} from 'immer';

class MyValue {

    [immerable] = true;

    constructor(data: unknown) {
        this.text = data.text;
        this.checkbox = data.checkbox;
        this.fruit = data.fruit;
        this.bar = data.bar;
        this.pets = data.pets;
    }

    text: string;
    checkbox: boolean;
    fruit: string|undefined;
    bar: {
        baz: number;
    };
    pets: Array<{name: string}>;

    stringy(): string {
        return `${this.text} ... ${this.fruit}`;
    }
}

export default function Main(): React.ReactElement {

    const router = useRouter();

    const form = useDendriform<MyValue>(() => {
        return new MyValue({
            text: 'ad',
            checkbox: true,
            fruit: undefined,
            bar: {
                baz: 12
            },
            pets: [
                {name: 'oh no'},
                {name: 'oh no!'},
                {name: 'oh noo!'}
            ]
        });
    }, {history: 100});

    form.useChange((value, details) => {
        // eslint-disable-next-line no-console
        console.log('value, details', value, details);
        // TODO - this messes up history
        //router.push(`?text=${thing.text}`)
    });

    const {text} = router.query;
    useEffect(() => {
        if(text) {
            form.branch('text').set(text);
        }
    }, [text]);

    // tick for testing pure rendering
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick(a => a + 2), 5000);
        return () => clearInterval(interval);
    }, []);

    return <Layout>
        <RenderRegion>
            <Box p={2}>
                Top level... notice how it doesnt rerender because it didnt use .useValue() and therefore didnt opt in to receiving value updates, even though the useDendriform() hook holding the state lives in this component. This is going to be a **huge** perf boost
            </Box>
            <Box p={2}>
                Tick: {tick} seconds
            </Box>
            {form.render(form => {
                const {canUndo, canRedo} = form.useHistory();
                return <Box p={2}>
                    <button onClick={() => form.undo()} disabled={!canUndo}>Undo</button>
                    <button onClick={() => form.redo()} disabled={!canRedo}>Redo</button>
                </Box>;
            })}
            <Box p={2}>
                <strong>Text inputs with debounce</strong><br/>
            </Box>
            <Box p={2}>
                {form.render('text', form => {
                    return <RenderRegion p={2}>
                        <input {...useInput(form, 150)} />
                    </RenderRegion>;
                })}
            </Box>
            <Box p={2}>
                {form.render('text', form => {
                    return <RenderRegion p={2}>
                        <input {...useInput(form, 150)} /> and tick dependency: {tick} seconds
                    </RenderRegion>;
                }, [tick])}
            </Box>



            <Box p={2}>
                <strong>Checkbox field</strong>
            </Box>
            <Box p={2}>
                {form.render('checkbox', form => {
                    return <RenderRegion p={2}>
                        <input type="checkbox" {...useCheckbox(form)} />
                    </RenderRegion>;
                })}
            </Box>



            <Box p={2}>
                <strong>Select field</strong>
            </Box>
            <Box p={2}>
                {form.render('fruit', form => {
                    return <RenderRegion p={2}>
                        <select {...useInput(form)}>
                            <option value="grapefruit">Grapefruit</option>
                            <option value="lime">Lime</option>
                            <option value="coconut">Coconut</option>
                            <option value="mango">Mango</option>
                        </select>
                    </RenderRegion>;
                })}
            </Box>


            <Box p={2}>
                <strong>Array of fields</strong>
            </Box>
            <Box p={2}>
                {form.renderAll('pets', form => {
                    //const [pets, setPets] = form.useValue();

                    return <RenderRegion p={2}>
                        {form.render('name', form => {
                            return <RenderRegion p={2}>
                                <input {...useInput(form, 150)} />
                            </RenderRegion>;
                        })}
                    </RenderRegion>;
                })}

                {form.render('pets', form => {
                    return <RenderRegion p={2}>
                        {form.renderAll(form => {
                            //const [pets, setPets] = pet.useValue();

                            return <RenderRegion p={2}>
                                {form.render('name', name => {
                                    return <RenderRegion p={2}>
                                        <input {...useInput(name, 150)} />
                                        {`${name.value}`}
                                    </RenderRegion>;
                                })}
                                {`${form.value.name}`}
                                <p>
                                    <span onClick={() => form.set(array.remove())}>X </span>
                                    <span onClick={() => form.setParent(index => array.move(index, index + 1))}>V </span>
                                    <span onClick={() => form.setParent(index => array.move(index, index - 1))}>^ </span>
                                </p>
                            </RenderRegion>;
                        })}
                    </RenderRegion>;
                })}

                <p onClick={() => form.branch('pets').set(array.unshift({name: 'new pet'}))}>unshift()</p>
                <p onClick={() => form.branch('pets').set(array.shift())}>shift()</p>
                <p onClick={() => form.branch('pets').set(array.push({name: 'new pet'}))}>push()</p>
                <p onClick={() => form.branch('pets').set(array.pop())}>pop()</p>
                <p onClick={() => form.branch('pets').set(array.move(1,2))}>swap 1 and 2()</p>
            </Box>



            <Box p={2}>
                <strong>Deep field calling set() directly</strong>
            </Box>
            <Box p={2}>
                {form.render(['bar','baz'], form => {
                    const [baz, setBaz] = form.useValue();

                    const upSet = useCallback(() => {
                        setBaz(baz + 3);
                    }, [baz]);

                    return <RenderRegion p={2}>
                        <p onClick={upSet}>Click to +3 - {baz}</p>
                    </RenderRegion>;
                })}
            </Box>



            <Box p={2}>
                <strong>Calling set() multiple times in a row</strong>
            </Box>
            <Box p={2}>
                {form.render('bar', form => {
                    const [bar, setBar] = form.useValue();

                    const up = useCallback(() => {
                        setBar(draft => {
                            draft.baz++;
                        });
                        setBar(draft => {
                            draft.baz++;
                        });
                        setBar(draft => {
                            draft.baz++;
                        });
                    }, []);

                    return <RenderRegion p={2}>
                        <p onClick={up}>Click to +3 - {bar.baz}</p>
                    </RenderRegion>;
                })}
            </Box>
        </RenderRegion>
    </Layout>;
}


// boring layout, skip this one

interface LayoutProps {
    children: React.ReactNode[]|React.ReactNode
}

const Layout = (props: LayoutProps): React.ReactElement => {
    return <Box p={3}>
        <h1>dendriform demo</h1>
        <Box mt={3} mb={6}>{props.children}</Box>
        <pre>{TEXT}</pre>
    </Box>;
};

interface RenderRegionProps {
    children: React.ReactNode[]|React.ReactNode;
    p?: number;
}

const RenderRegion = (props: RenderRegionProps): React.ReactElement => {
    const num = () => Math.floor(Math.random() * 100) + 156;
    const backgroundColor = `rgb(${num()},${num()},${num()})`;
    return <Box style={{backgroundColor}} {...props} />;
};

*/

export default function Main(): React.ReactElement {
    return <Wrapper page>
        <Flex alignItems="center" mt={4} mb={4}>
            <Box mr={4} width="5rem" pt={2}>
                <img alt="Dendriform logo" src="/logo-dendriform.png" width="100%" />
            </Box>
            <Box maxWidth="20rem">
                <Logo>dendriform</Logo>
                <Text as="div" color="subtitle" style={{fontStyle: "italic", lineHeight: '1.3rem'}}>Build feature-rich data-editing React UIs with great performance and not much code.</Text>
            </Box>
        </Flex>
        <FloatZone>
            <Badge src="https://img.shields.io/npm/v/dendriform.svg" to="https://www.npmjs.com/package/dendriform">NPM</Badge>
            <Badge src="https://github.com/92green/dendriform/workflows/CI/badge.svg?branch=master">CI: Build Status</Badge>
            <Badge src="https://img.shields.io/badge/Maturity-Early%20days-yellow">Maturity: Early Days</Badge>
            <Badge src="https://img.shields.io/badge/Coolness-Reasonable-blue">Coolness Reasonable</Badge>
        </FloatZone>
        <Box my={5}>
            <Text fontSize="big">Looking for the docs or source code? <Link href="https://github.com/92green/dendriform">Go to the github repo.</Link></Text>
        </Box>
        {/*<Hr />
        <Box mb={3}>
            <H1>Demos</H1>
        </Box>*/}
    </Wrapper>;
}

const Logo = styled(Box)`
    font-size: 2.5rem;
    line-height: 2rem;
    margin-bottom: .5rem;
    color: ${props => props.theme.colors.heading};
`;

const Hr = styled.div`
    border-bottom: 1px solid ${props => props.theme.colors.line};
    margin: 2rem 0;
`;

type BadgeProps = {
    children: string;
    src: string;
    to?: string;
};

const Badge = styled((props: BadgeProps): React.ReactElement => {
    const {src, children = '', to} = props;
    const img = <img src={src} alt={children} title={children} />;
    return to ? <a href={to}>{img}</a> : img;
})`
    img {
        display: block;
    }
`;
