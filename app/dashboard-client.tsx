"use client";
import {useState} from "react";
import ThemeToggle from "./theme-toggle";
import {BusinessPlanner,EmployeePlanner} from "./planners";

type Section="My Businesses"|"My Employees"|"Settings";
const pages:Section[]=["My Businesses","My Employees","Settings"];

export default function Dashboard({email,signOutAction}:{email?:string;signOutAction:()=>Promise<void>}){
 const [page,setPage]=useState<Section>("My Employees");
 return <div className="shell">
  <aside className="side">
   <div className="logo">MY<span>FOUNDER</span>HQ™</div>
   <div><div className="label">Command Center</div><nav className="nav" aria-label="Main navigation">
    {pages.map(p=><button type="button" key={p} className={page===p?"active":""} aria-current={page===p?"page":undefined} onClick={()=>setPage(p)}>{p}</button>)}
   </nav></div>
   <div className="foot">Caracal Technologies Inc.<br/>Version 0.1 • Initial foundation</div>
  </aside>
  <main className="main">
   {page==="My Businesses"&&<BusinessPlanner accountKey={email||"anonymous"}/>}
   {page==="My Employees"&&<EmployeePlanner accountKey={email||"anonymous"}/>}
   {page==="Settings"&&<>
    <div className="eyebrow">Founder Operating System</div>
    <div className="header"><h1>Settings</h1><p>Your MyFounderHQ workspace.</p></div>
    <div className="card">
     <h3>Account</h3>
     {email&&<div className="row"><strong>Signed in</strong><span>{email}</span></div>}
     <div className="row"><strong>Appearance</strong><ThemeToggle/></div>
     <div className="row settings-signout"><strong>Session</strong><form action={signOutAction}><button className="settings-signout-button" type="submit">Sign out</button></form></div>
    </div>
   </>}
  </main>
 </div>;
}
