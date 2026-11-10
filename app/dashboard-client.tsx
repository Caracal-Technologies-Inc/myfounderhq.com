"use client";
import {useState} from "react";
import ThemeToggle from "./theme-toggle";
import {BusinessPlanner} from "./live-planners";
import AIEmployeeDirectory from "./employee-directory";

type Section="Businesses"|"Employees"|"Settings";
const pages:Section[]=["Businesses","Employees","Settings"];

export default function Dashboard({email,userId,signOutAction}:{email?:string;userId:string;signOutAction:()=>Promise<void>}){
 const [page,setPage]=useState<Section>("Employees");
 return <div className="shell">
  <aside className="side">
   <div className="logo">MY<span>FOUNDER</span>HQ™</div>
   <div><div className="label">Command Center</div><nav className="nav" aria-label="Main navigation">
    {pages.map(p=><button type="button" key={p} className={page===p?"active":""} aria-current={page===p?"page":undefined} onClick={()=>setPage(p)}>{p}</button>)}
   </nav></div>
   <div className="foot">Caracal Technologies Inc.<br/>Version 0.1 • Initial foundation</div>
  </aside>
  <main className="main">
   {page==="Businesses"&&<BusinessPlanner userId={userId}/>}
   {page==="Employees"&&<AIEmployeeDirectory userId={userId}/>}
   {page==="Settings"&&<>
    <div className="eyebrow">Founder Operating System</div>
    <div className="header"><h1>Settings</h1><p>Your MyFounderHQ workspace.</p></div>
    <div className="card">
     <h3>Account</h3>
     {email&&<div className="row"><strong>Signed in</strong><span>{email}</span></div>}
     <div className="row"><strong>Appearance</strong><ThemeToggle userId={userId}/></div>
     <div className="row settings-signout"><strong>Session</strong><form action={signOutAction}><button className="settings-signout-button" type="submit">Sign out</button></form></div>
    </div>
   </>}
  </main>
 </div>;
}
