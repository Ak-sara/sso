export type AnchorType =
    | 'parent_in'  | 'parent_out'
    | 'below_in'   | 'below_out'
    | 'neck_out'   | 'l_neck' | 'r_neck'
    | 'stack_in';

export interface NodeRef {
    getAnchor(type: AnchorType): [number, number];
}

export interface Registry {
    register(key: string, ref: NodeRef): void;
    unregister(key: string): void;
    get(key: string): NodeRef | undefined;
}
export const REGISTRY_CTX = Symbol('node-registry');


// import { browser } from '$app/environment';
// if (browser) {
const SVG_NS = 'http://www.w3.org/2000/svg';

export const Draw=(wrapper:string,props:{})=>{
    if (typeof document === 'undefined') {
        console.log('unloaded')
        return;
    }
    const works:{
        EL: HTMLElement | null;
        svg: SVGSVGElement | null;
        connector:{ };
        init: () => void;
        makePath: (d:string,style?:string,color?:string,size?:string) => SVGPathElement;
        drawGrid: () => void;
    }={
        EL: document.getElementById(wrapper),
        svg: null,
        init:()=>{
            works.svg=document.createElementNS(SVG_NS,'svg') as SVGSVGElement
            works.svg.setAttribute("width","100%" )
            works.svg.setAttribute("height","100%")
            works.svg.setAttribute("viewBox","0 0 1000 1000")
            works.svg.setAttribute("xml:space","preserve")
            let ta=document.createElementNS(SVG_NS,'marker') as SVGMarkerElement
            let sq=document.createElementNS(SVG_NS,'marker') as SVGMarkerElement
            ta.setAttribute("id","triangle")
            ta.setAttribute("orient","auto-start-reverse")
            ta.setAttribute("style","overflow:visible")

            sq.setAttribute("id","square")
            sq.setAttribute("orient","auto")
            sq.setAttribute("style","overflow:visible")

            ta.append(works.makePath('M 5,0 -2,5 V -5 Z','stroke:none;fill:#F00;transform:scale(.9);'))
            sq.append(works.makePath('M -5,-5 V 5 H 5 V -5 Z','stroke:none;fill:#00F;transform:scale(.5);'))
            works.svg.append(ta,sq)
            works.EL?.append(works.svg)
            works.drawGrid()
        },
        connector:{
            bottom_to_l:(x:number,y:number,distant:number)=>{ return `M${x}${y} v-300 h-${distant} v-300`; },
            bottom_to_r:(x:number,y:number,distant:number)=>{ return `M${x}${y} v-300 h${distant} v-300`; },
            side_to_l:(x:number,y:number,elev:number,distant:number)=>{ return `M${x}${y} h-300 v-${elev} h-${distant}}`; },
            side_to_r:(x:number,y:number,elev:number,distant:number)=>{ return `M${x}${y} h300 v-${elev} h${distant}`; },
        },
        makePath:(d:string,style='',color=`#333`,size='1')=>{
            const p=document.createElementNS(SVG_NS,'path')
            p.setAttribute('d',d)
            if(color!='') p.setAttribute('stroke',color)
            if(size!='')p.setAttribute('stroke-width',size)
            switch(style){
                case 'dotted':
                    p.setAttribute('stroke-dasharray', '1, 4'); break;
                case 'dashed':
                    p.setAttribute('stroke-dasharray', '8, 6'); break;
                default:
                    p.setAttribute('style',style); break;
            }
            return p;
        },
        drawGrid:()=>{
            const g=document.createElementNS(SVG_NS,'g')
            g.setAttribute('id','grids')
            for(let x=100; x<1000; x+=100){
                let p=works.makePath(`M${x},1000 L${x},5`,'dotted')
                p.setAttribute('marker-start','url(#square)')
                p.setAttribute('marker-end','url(#triangle)')
                g.append(p)
            }
            for(let x=100; x<1000; x+=100){
                let p=works.makePath(`M0,${x} L1000,${x}`,'dashed')
                p.setAttribute('marker-start','url(#square)')
                p.setAttribute('marker-end','url(#triangle)')
                g.append(p)
            }
            works.svg?.append(g)
        }
    } 
    works.init()
    return works;
}
