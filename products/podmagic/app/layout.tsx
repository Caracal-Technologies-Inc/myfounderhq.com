import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"POD Magic™ | Design Studio",description:"Create, organize and prepare merchandise designs with POD Magic."};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
