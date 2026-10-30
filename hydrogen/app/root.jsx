import {Links,Meta,Outlet,Scripts,ScrollRestoration,isRouteErrorResponse,useRouteError} from 'react-router';
import {useNonce} from '@shopify/hydrogen';
const nav=[['/','Home'],['/shop','Shop'],['/builds','Builds'],['/technology','Technology'],['/story','Our story']];
export function links(){return [
{rel:'preconnect',href:'https://fonts.googleapis.com'},
{rel:'preconnect',href:'https://fonts.gstatic.com',crossOrigin:'anonymous'},
{rel:'stylesheet',href:'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'},
{rel:'stylesheet',href:'/assets/site.css'},
];}
export function Layout({children}){const nonce=useNonce();return <html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#ffffff"/><Meta/><Links/></head><body>{children}<ScrollRestoration nonce={nonce}/><Scripts nonce={nonce}/></body></html>;}
export default function App(){return <><a className="skip" href="#main">Skip to content</a><header className="header"><div className="bar"><a className="brand" href="/">PARAGON LIFE</a><nav className="nav" aria-label="Primary">{nav.map(([url,name])=><a key={url} href={url}>{name}</a>)}</nav><a href="/shop" className="bag" aria-label="Shop Paragon Life merchandise">Shop</a></div></header><Outlet/><footer className="footer"><div><strong>PARAGON LIFE</strong><p>Cars, bikes, off-road, tech, and the good life. Real projects, real adventures.</p></div><nav aria-label="Footer">{nav.map(([url,name])=><a href={url} key={url}>{name}</a>)}<a href="/sitemap.xml">Sitemap</a><a href="https://coffee.digitalparagon.com/">Paragon Coffee</a><a href="https://www.instagram.com/paragon.life/" rel="noopener noreferrer">Instagram</a></nav><small>© 2026 Paragon Life · Digital Paragon</small></footer></>;}
export function ErrorBoundary(){const error=useRouteError();const code=isRouteErrorResponse(error)?error.status:500;return <main id="main" className="page"><h1>{code}</h1><p>That page isn't available.</p><a href="/">Back to Paragon Life</a></main>;}
