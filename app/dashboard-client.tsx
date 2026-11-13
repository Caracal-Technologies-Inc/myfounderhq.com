"use client";
import React,{useCallback,useEffect,useMemo,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";
import AccountSettings from "./account-settings";
import {BusinessPlanner} from "./live-planners";
import AIEmployeeDirectory from "./employee-directory";

type GroupKey="primary"|"financial"|"tools"|"settings";
type Tab={id:string;tableId:string;sourceTitle:string};
const BASE_ID="appXJH6TJLqOLvpWu";
const TABS:Record<string,Tab>={
 "Businesses":{id:"Businesses",tableId:"tbltQzsCZvaVC5tzn",sourceTitle:"Businesses"},
 "Employees":{id:"Employees",tableId:"tblXH9c128k8GoRvq",sourceTitle:"Employees"},
 "Influencers":{id:"Influencers",tableId:"tblQEqkXhKUB66WWi",sourceTitle:"Influencers"},
 "Social Media Agencies":{id:"Social Media Agencies",tableId:"tbl400XqqxEb1D688",sourceTitle:"Social Media Agencies"},
 "News Agencies":{id:"News Agencies",tableId:"tblEP4FaP99MUumNS",sourceTitle:"News Agencies"},
 "Calendar":{id:"Calendar",tableId:"tblR8pTywK0U9BfzS",sourceTitle:"Calendar"},
 "Dashboard":{id:"Dashboard",tableId:"tbluKuGLU2JdWzV8g",sourceTitle:"Financial overview"},
 "Financial ledger":{id:"Financial ledger",tableId:"tblF8wIXASQ23uTzf",sourceTitle:"Financial ledger"},
 "Profits":{id:"Profits",tableId:"tblACMHYnTBWIfB5P",sourceTitle:"Profits"},
 "Expenditures":{id:"Expenditures",tableId:"tblmF5JqotSwrJ8p8",sourceTitle:"Expenditures"},
 "Investments":{id:"Investments",tableId:"tblW1WOGjSlI0S6be",sourceTitle:"Investments"},
 "Rewards":{id:"Rewards",tableId:"tbl0wnOJDRk5QhWlm",sourceTitle:"Rewards"},
 "Savings":{id:"Savings",tableId:"tblQ0Sxj1V7Twb1oI",sourceTitle:"Savings"},
 "Settings":{id:"Settings",tableId:"tbljdlMb8UHmzDlzF",sourceTitle:"Settings"},
 "Paid Services":{id:"Paid Services",tableId:"tbll8GiW7upsptNY9",sourceTitle:"Paid Services"},
 "Bank accounts":{id:"Bank accounts",tableId:"tblgK1tloLFJuKtv2",sourceTitle:"Bank accounts"},
 "Document wallet":{id:"Document wallet",tableId:"tbl1FwjVuKykSlnPx",sourceTitle:"Document wallet"},
 "Email wallet":{id:"Email wallet",tableId:"tblb2bfTgKbl8oJwp",sourceTitle:"Email wallet"},
 "Password wallet":{id:"Password wallet",tableId:"tbliGacp6gStaSeax",sourceTitle:"Password wallet"},
 "Address wallet":{id:"Address wallet",tableId:"tblBtH9ynY6bdei2c",sourceTitle:"Address wallet"}
};
type Navigation={primary:string[];financial:string[];tools:string[];settings:string[];financialOpen:boolean;toolsOpen:boolean;settingsOpen:boolean};
const DEFAULT:Navigation={
 primary:["Businesses","Employees","Influencers","Social Media Agencies","News Agencies","Calendar"],
 financial:["Dashboard","Financial ledger","Profits","Expenditures","Investments","Rewards","Savings"],
 tools:["ChatGPT Project Creator","Instagram Account Opener"],
 settings:["Settings","Paid Services","Bank accounts","Document wallet","Email wallet","Password wallet","Address wallet"],
 financialOpen:false,toolsOpen:false,settingsOpen:false
};
const groupKeys:GroupKey[]=["primary","financial","tools","settings"];
function normalize(saved:unknown,group:GroupKey):string[]{
 const canonical=DEFAULT[group];
 if(!Array.isArray(saved))return canonical.slice();
 const known=saved.filter((item):item is string=>typeof item==="string"&&canonical.includes(item));
 return [...new Set(known),...canonical.filter(id=>!known.includes(id))];
}
function AirtableTab({tab}:{tab:Tab}){
 const url="https://airtable.com/"+BASE_ID+"/"+tab.tableId;
 return <section className="hq-source-page">
  <div className="eyebrow">{tab.id==="Dashboard"?"FINANCIAL OVERVIEW":"WORKSPACE"}</div>
  <h1>{tab.id}</h1>
  <div className="hq-source-panel">
   <h2>{tab.sourceTitle}</h2>
   <p>This tab is linked to its existing Airtable table. Its records are not yet synchronized into MyFounderHQ or Supabase. Open the source table to work with the real data.</p>
   <a href={url} target="_blank" rel="noopener noreferrer">Open in Airtable <span aria-hidden="true">↗</span></a>
  </div>
 </section>;
}
export default function Dashboard({email,userId,signOutAction}:{email?:string;userId:string;signOutAction:()=>Promise<void>}){
 const db=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),[]);
 const [page,setPage]=useState("Businesses");
 const [nav,setNav]=useState<Navigation>(DEFAULT);
 const [reordering,setReordering]=useState(false);
 const [navLoading,setNavLoading]=useState(true);
 const [navError,setNavError]=useState("");
 const [dragging,setDragging]=useState<{group:GroupKey;name:string}|null>(null);
 useEffect(()=>{
  let active=true;
  void (async()=>{
   const {data,error}=await db.from("hq_navigation_preferences").select("*").eq("user_id",userId).maybeSingle();
   if(!active)return;
   if(error)setNavError("Could not load your saved navigation. "+error.message);
   else if(data)setNav({
    primary:normalize(data.primary_tabs,"primary"),
    financial:normalize(data.financial_tabs,"financial"),
    tools:normalize(data.tools_tabs,"tools"),
    settings:normalize(data.settings_tabs,"settings"),
    financialOpen:!!data.financial_open,toolsOpen:!!data.tools_open,settingsOpen:!!data.settings_open
   });
   setNavLoading(false);
  })();
  return()=>{active=false;};
 },[db,userId]);
 const save=useCallback(async(next:Navigation)=>{
  setNav(next);setNavError("");
  const {error}=await db.from("hq_navigation_preferences").upsert({
   user_id:userId,
   primary_tabs:next.primary,
   financial_tabs:next.financial,
   tools_tabs:next.tools,
   settings_tabs:next.settings,
   financial_open:next.financialOpen,
   tools_open:next.toolsOpen,
   settings_open:next.settingsOpen,
   updated_at:new Date().toISOString()
  },{onConflict:"user_id"});
  if(error)setNavError("Could not save navigation: "+error.message);
 },[db,userId]);
 const openKey=(group:Exclude<GroupKey,"primary">):"financialOpen"|"toolsOpen"|"settingsOpen"=>group==="financial"?"financialOpen":group==="tools"?"toolsOpen":"settingsOpen";
 const toggle=(group:Exclude<GroupKey,"primary">)=>{
  if(navLoading)return;
  const key=openKey(group);
  void save({...nav,[key]:!nav[key]});
 };
 const move=(group:GroupKey,from:number,to:number)=>{
  const items=nav[group].slice();
  if(from<0||to<0||from>=items.length||to>=items.length||from===to)return;
  const [item]=items.splice(from,1);items.splice(to,0,item);
  void save({...nav,[group]:items});
 };
 const changePage=(name:string,group:GroupKey)=>{
  setPage(name);
  if(group!=="primary"&&!nav[openKey(group)])void save({...nav,[openKey(group)]:true});
 };
 const renderGroup=(group:GroupKey)=>{
  const list=nav[group];
  const expandable=group!=="primary";
  const expanded=expandable?nav[openKey(group)]:true;
  const title=group==="financial"?"Financial Overview":group==="tools"?"Tools":"Settings";
  return <div className="hq-side-group" key={group}>
   {expandable&&<button type="button" className="hq-group-toggle" aria-expanded={expanded} onClick={()=>toggle(group)}>
    <span>{title}</span><span aria-hidden="true">{expanded?"⌄":"›"}</span>
   </button>}
   {expanded&&<div className="hq-nav-items">
    {group==="tools"&&<div className="hq-tool-subheading">Bulk Tools</div>}
    {list.map((name,index)=><div className="hq-nav-row" key={name}
     draggable={reordering} onDragStart={e=>{if(!reordering)return;e.dataTransfer.effectAllowed="move";setDragging({group,name});}}
     onDragOver={e=>{if(reordering&&dragging?.group===group)e.preventDefault();}}
     onDrop={e=>{e.preventDefault();if(dragging?.group===group)move(group,list.indexOf(dragging.name),index);setDragging(null);}}
     onDragEnd={()=>setDragging(null)}>
      <button type="button" className={"hq-nav-page "+(page===name?"active":"")} aria-current={page===name?"page":undefined} onClick={()=>changePage(name,group)}>{name}</button>
      {reordering&&<div className="hq-nav-move"><button type="button" title={"Move "+name+" up"} aria-label={"Move "+name+" up"} disabled={index===0} onClick={()=>move(group,index,index-1)}>↑</button><button type="button" title={"Move "+name+" down"} aria-label={"Move "+name+" down"} disabled={index===list.length-1} onClick={()=>move(group,index,index+1)}>↓</button></div>}
     </div>)}
   </div>}
  </div>;
 };
 const current=TABS[page];
 const isTool=DEFAULT.tools.includes(page);
 return <div className="shell">
  <aside className="side hq-nav-side">
   <div className="logo">MY<span>FOUNDER</span>HQ™</div>
   <div className="hq-nav-sidebar"><div className="hq-nav-heading"><div className="label">Command Center</div><button className="hq-reorder-toggle" type="button" disabled={navLoading} onClick={()=>setReordering(x=>!x)} aria-pressed={reordering}>{reordering?"Done":"Reorder"}</button></div>
    {navError&&<p role="alert" className="hq-nav-error">{navError}</p>}
    {reordering&&<p className="hq-nav-help">Drag tabs or use the arrows to change their order.</p>}
    <nav className="hq-nav-groups" aria-label="Main navigation">{groupKeys.map(renderGroup)}</nav>
   </div>
   <div className="foot">Caracal Technologies Inc.<br/>Version 0.1 • Initial foundation</div>
  </aside>
  <main className="main">
   {page==="Businesses"?<BusinessPlanner userId={userId}/>
    :page==="Employees"?<AIEmployeeDirectory userId={userId}/>
    :page==="Settings"?<AccountSettings userId={userId} initialEmail={email} signOutAction={signOutAction}/>
    :isTool?<section className="hq-source-page"><div className="eyebrow">AUTOMATION TOOLS</div><h1>{page}</h1><div className="hq-source-panel"><h2>Not configured</h2><p>This automation has not been built or connected. No accounts or projects have been created, and no browser actions are running.</p><p>When implemented, this tool can use an approved workflow with connected services and explicit execution results.</p></div></section>
    :current?<AirtableTab tab={current}/>:null}
  </main>
 </div>;
}
