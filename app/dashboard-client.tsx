"use client";
import {useState} from "react";
import AccountSettings from "./account-settings";
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
   {page==="Settings"&&<AccountSettings userId={userId} initialEmail={email} signOutAction={signOutAction}/>}
  </main>
 </div>;
}
