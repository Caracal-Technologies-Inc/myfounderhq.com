"use client";
import React,{useCallback,useEffect,useMemo,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";
import AccountSettings from "./account-settings";
import {BusinessPlanner} from "./live-planners";
import AIEmployeeDirectory from "./employee-directory";

type GroupKey="primary"|"financial"|"tools"|"resources"|"settings";
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
 "Account":{id:"Account",tableId:"tbljdlMb8UHmzDlzF",sourceTitle:"Settings"},
 "Subscriptions":{id:"Subscriptions",tableId:"tbll8GiW7upsptNY9",sourceTitle:"Subscriptions"},
 "Bank accounts":{id:"Bank accounts",tableId:"tblgK1tloLFJuKtv2",sourceTitle:"Bank accounts"},
 "Document wallet":{id:"Document wallet",tableId:"tbl1FwjVuKykSlnPx",sourceTitle:"Document wallet"},
 "Email wallet":{id:"Email wallet",tableId:"tblb2bfTgKbl8oJwp",sourceTitle:"Email wallet"},
 "Password wallet":{id:"Password wallet",tableId:"tbliGacp6gStaSeax",sourceTitle:"Password wallet"},
 "Address wallet":{id:"Address wallet",tableId:"tblBtH9ynY6bdei2c",sourceTitle:"Address wallet"}
};
type Navigation={primary:string[];financial:string[];tools:string[];resources:string[];settings:string[];financialOpen:boolean;toolsOpen:boolean;settingsOpen:boolean};
const DEFAULT:Navigation={
 primary:["Businesses","Employees","Influencers","Social Media Agencies","News Agencies"],
 financial:["Financial ledger","Profits","Expenditures","Investments","Rewards","Savings"],
 tools:["ChatGPT Project Creator","Instagram Account Opener","POD Merch Generator"],
 resources:["Short Form Video Templates","Reference App(s) Screenshot Library"],
 settings:["Account","Subscriptions","Bank accounts","Document wallet","Email wallet","Password wallet","Address wallet"],
 financialOpen:false,toolsOpen:false,settingsOpen:false
};
const groupKeys:GroupKey[]=["primary","financial","tools","resources","settings"];
const sidebarIcons:Record<string,string>={
 Businesses:"▦",Employees:"♙",Influencers:"✦","Social Media Agencies":"◎","News Agencies":"▤",
 "Financial Overview":"◫",Tools:"⌘",Settings:"⚙",Account:"♙",
 "Financial ledger":"▥",Profits:"↗",Expenditures:"↘",Investments:"◇",Rewards:"★",Savings:"▣",
 "ChatGPT Project Creator":"⊞","Instagram Account Opener":"◎","POD Merch Generator":"▧",
 "Short Form Video Templates":"▣","Reference App(s) Screenshot Library":"▤",
 "Subscriptions":"◈","Bank accounts":"▣","Document wallet":"▤","Email wallet":"✉",
 "Password wallet":"⚿","Address wallet":"⌖"
};
function normalize(saved:unknown,group:GroupKey):string[]{
 const canonical=DEFAULT[group];
 if(!Array.isArray(saved))return canonical.slice();
 const known=saved.map(item=>group==="settings"&&item==="Settings"?"Account":group==="settings"&&item==="Paid Services"?"Subscriptions":item).filter((item):item is string=>typeof item==="string"&&canonical.includes(item));
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
 const [activeApp,setActiveApp]=useState("MyFounderHQ");
 const [appShortcuts,setAppShortcuts]=useState<string[]>(["MyFounderHQ","Media Magic","POD Magic"]);
 const [contextOpen,setContextOpen]=useState(true);
 const [launcherLoading,setLauncherLoading]=useState(true);
 const [launcherError,setLauncherError]=useState("");
 const [manageLauncher,setManageLauncher]=useState(false);
 const [newAppName,setNewAppName]=useState("");
 const [savingLauncher,setSavingLauncher]=useState(false);
  const [accountMenuOpen,setAccountMenuOpen]=useState(false);
 const [profileName,setProfileName]=useState("");
 const [avatarUrl,setAvatarUrl]=useState("");
 useEffect(()=>{
  let active=true;
  void (async()=>{
   const [auth,profile]=await Promise.all([
    db.auth.getUser(),
    db.from("hq_founder_profiles").select("full_name").eq("user_id",userId).maybeSingle()
   ]);
   if(!active)return;
   setProfileName(profile.data?.full_name||auth.data.user?.user_metadata?.full_name||"");
   const avatar=auth.data.user?.user_metadata?.avatar_url;
   if(typeof avatar==="string"&&/^https:\/\//.test(avatar))setAvatarUrl(avatar);
  })();
  return()=>{active=false;};
 },[db,userId]);
 useEffect(()=>{
  const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape"){setAccountMenuOpen(false);}};
  window.addEventListener("keydown",onKey);
  return()=>window.removeEventListener("keydown",onKey);
 },[]);
 const [nav,setNav]=useState<Navigation>(DEFAULT);
 const [reordering,setReordering]=useState(false);
 const [navLoading,setNavLoading]=useState(true);
 const [navError,setNavError]=useState("");
 const [dragging,setDragging]=useState<{group:GroupKey;name:string}|null>(null);
 useEffect(()=>{
  let active=true;
  void (async()=>{
   const {data,error}=await db.from("hq_launcher_preferences")
    .select("app_shortcuts,context_sidebar_open").eq("user_id",userId).maybeSingle();
   if(!active)return;
   if(error)setLauncherError("Couldn't load your app shortcuts: "+error.message);
   else if(data){
    const saved=Array.isArray(data.app_shortcuts)?data.app_shortcuts.filter((a:unknown):a is string=>typeof a==="string"&&a.length>0):[];
    setAppShortcuts(["MyFounderHQ",...new Set(saved.filter(a=>a!=="MyFounderHQ"))]);
    setContextOpen(data.context_sidebar_open!==false);
   }
   setLauncherLoading(false);
  })();
  return()=>{active=false;};
 },[db,userId]);
 const saveLauncher=useCallback(async(shortcuts:string[],opened:boolean)=>{
  setLauncherError("");
  setSavingLauncher(true);
  const {error}=await db.from("hq_launcher_preferences").upsert({
   user_id:userId,app_shortcuts:shortcuts,context_sidebar_open:opened,updated_at:new Date().toISOString()
  },{onConflict:"user_id"});
  if(error)setLauncherError("Couldn't save launcher settings: "+error.message);
  setSavingLauncher(false);
 },[db,userId]);
 const toggleContext=()=>{
  if(launcherLoading||savingLauncher)return;
  const opened=!contextOpen;
  setContextOpen(opened);
  void saveLauncher(appShortcuts,opened);
 };
 const activateApp=(app:string)=>{
  setActiveApp(app);
  setAccountMenuOpen(false);
  setContextOpen(true);
  if(!contextOpen)void saveLauncher(appShortcuts,true);
 };
 const addShortcut=()=>{
  const name=newAppName.trim().replace(/\s+/g," ").slice(0,56);
  if(!name||appShortcuts.includes(name))return;
  const next=[...appShortcuts,name];
  setAppShortcuts(next);
  setNewAppName("");
  void saveLauncher(next,contextOpen);
 };
 const removeShortcut=(app:string)=>{
  if(app==="MyFounderHQ")return;
  const next=appShortcuts.filter(name=>name!==app);
  setAppShortcuts(next);
  if(activeApp===app)setActiveApp("MyFounderHQ");
  void saveLauncher(next,contextOpen);
 };
 const shiftShortcut=(app:string,direction:-1|1)=>{
  const old=appShortcuts.indexOf(app), target=old+direction;
  if(old<1||target<1||target>=appShortcuts.length)return;
  const next=appShortcuts.slice();
  [next[old],next[target]]=[next[target],next[old]];
  setAppShortcuts(next);
  void saveLauncher(next,contextOpen);
 };
 const appMonogram=(app:string)=>{
  if(app==="MyFounderHQ")return "M";
  if(app==="Media Magic")return "▶";
  if(app==="POD Magic")return "▦";
  return app.split(/\s+/).map(word=>word[0]||"").join("").slice(0,2).toUpperCase();
 };
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
    resources:normalize(data.tools_resources_tabs,"resources"),
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
   tools_resources_tabs:next.resources,
   settings_tabs:next.settings,
   financial_open:next.financialOpen,
   tools_open:next.toolsOpen,
   settings_open:next.settingsOpen,
   updated_at:new Date().toISOString()
  },{onConflict:"user_id"});
  if(error)setNavError("Could not save navigation: "+error.message);
 },[db,userId]);
 const move=(group:GroupKey,from:number,to:number)=>{
  const items=nav[group].slice();
  if(from<0||to<0||from>=items.length||to>=items.length||from===to)return;
  const [item]=items.splice(from,1);items.splice(to,0,item);
  void save({...nav,[group]:items});
 };
 const changePage=(name:string,group:GroupKey)=>{
  setPage(name);setAccountMenuOpen(false);
 };
 const renderGroup=(group:GroupKey)=>{
  const list=nav[group];
  const title=group==="financial"?"Financial Overview":group==="tools"||group==="resources"?"Tools":"Settings";
  return <div className="hq-side-group" key={group}>
   {group!=="primary"&&group!=="resources"&&<div className="hq-group-heading"><span className="hq-side-icon" aria-hidden="true">{sidebarIcons[title]}</span><span className="hq-side-text">{title}</span></div>}
   <div className="hq-nav-items">
    {group==="tools"&&<div className="hq-tool-subheading">Bulk Creation</div>}
    {group==="resources"&&<div className="hq-tool-subheading">Resources</div>}
    {list.map((name,index)=><div className="hq-nav-row" key={name}
     draggable={reordering} onDragStart={e=>{if(!reordering)return;e.dataTransfer.effectAllowed="move";setDragging({group,name});}}
     onDragOver={e=>{if(reordering&&dragging?.group===group)e.preventDefault();}}
     onDrop={e=>{e.preventDefault();if(dragging?.group===group)move(group,list.indexOf(dragging.name),index);setDragging(null);}}
     onDragEnd={()=>setDragging(null)}>
      <button type="button" className={"hq-nav-page "+(page===name?"active":"")} aria-current={page===name?"page":undefined} onClick={()=>changePage(name,group)} title={name}><span className="hq-side-icon" aria-hidden="true">{sidebarIcons[name]||"•"}</span><span className="hq-side-text">{name}</span></button>
      {reordering&&<div className="hq-nav-move"><button type="button" title={"Move "+name+" up"} aria-label={"Move "+name+" up"} disabled={index===0} onClick={()=>move(group,index,index-1)}>↑</button><button type="button" title={"Move "+name+" down"} aria-label={"Move "+name+" down"} disabled={index===list.length-1} onClick={()=>move(group,index,index+1)}>↓</button></div>}
     </div>)}
   </div>
  </div>;
 };
 const current=TABS[page];
 const isTool=DEFAULT.tools.includes(page);
 const isResource=DEFAULT.resources.includes(page);
 return <div className="hq-dual-shell">
  <nav className="hq-app-rail" aria-label="Application launcher">
   <button className="hq-rail-control" type="button" title={contextOpen?"Hide menu":"Show menu"} aria-label={contextOpen?"Hide navigation menu":"Show navigation menu"} aria-expanded={contextOpen} onClick={toggleContext}>
    <span aria-hidden="true">☷</span>
   </button>
   <div className="hq-rail-divider"/>
   <div className="hq-app-shortcuts">
    {appShortcuts.map(app=><button key={app} type="button" className={"hq-app-shortcut"+(activeApp===app?" selected":"")} onClick={()=>activateApp(app)} title={app} aria-label={"Open "+app} aria-current={activeApp===app?"page":undefined}>
      <span aria-hidden="true">{appMonogram(app)}</span>
    </button>)}
   </div>
   <div className="hq-rail-bottom">
    <button type="button" className="hq-rail-control" title="Customize apps" aria-label="Customize app shortcuts" onClick={()=>setManageLauncher(true)}><span aria-hidden="true">＋</span></button>
    <button type="button" className="hq-rail-control" title="Account" aria-label="Open account settings" onClick={()=>{setActiveApp("MyFounderHQ");setPage("Account");setContextOpen(true);}}><span aria-hidden="true">⚙</span></button>
   </div>
  </nav>
  {contextOpen&&<aside className="hq-context-sidebar" aria-label={activeApp+" navigation"}>
   <div className="hq-context-header">
    <div className="hq-context-title"><span className="hq-context-mark">{appMonogram(activeApp)}</span><strong>{activeApp}</strong></div>
    <button className="hq-context-close" type="button" title="Collapse sidebar" aria-label="Collapse contextual sidebar" onClick={toggleContext}>‹</button>
   </div>
   {activeApp==="MyFounderHQ"?<>
    <div className="hq-nav-sidebar"><div className="hq-nav-heading"><div className="label hq-side-text">Dashboard</div><button className="hq-reorder-toggle" type="button" disabled={navLoading} onClick={()=>setReordering(x=>!x)} aria-pressed={reordering}>{reordering?"Done":"Reorder"}</button></div>
     {navError&&<p role="alert" className="hq-nav-error">{navError}</p>}
     {reordering&&<p className="hq-nav-help">Drag tabs or use the arrows to change their order.</p>}
     <nav className="hq-nav-groups" aria-label="MyFounderHQ pages">{groupKeys.map(renderGroup)}</nav>
    </div>
    <div className="hq-context-footer">
     {accountMenuOpen&&<div className="hq-account-popover" role="group" aria-label="Account menu">
      <div className="hq-account-menu-heading"><strong>{profileName||"My account"}</strong><span>{email||"Signed-in account"}</span></div>
      <button type="button" onClick={()=>{setPage("Account");setAccountMenuOpen(false);}}>♙ <span>Account</span></button>
      <button type="button" onClick={()=>{setPage("Account");setAccountMenuOpen(false);}}>◐ <span>Appearance</span></button>
      <div className="hq-account-menu-divider"/>
      <form action={signOutAction}><button type="submit">⇥ <span>Log out</span></button></form>
     </div>}
     <button className="hq-profile-trigger" type="button" aria-expanded={accountMenuOpen} aria-label="Open account menu" onClick={()=>setAccountMenuOpen(v=>!v)}>
      <span className="hq-profile-avatar">{avatarUrl?<img src={avatarUrl} alt="" referrerPolicy="no-referrer"/>:(profileName||email||"M").trim().slice(0,1).toUpperCase()}</span>
      <span className="hq-profile-caption"><strong>{profileName||"My account"}</strong><small>{email||"Account settings"}</small></span>
      <span className="hq-profile-dots" aria-hidden="true">⋯</span>
     </button>
    </div>
   </>:<div className="hq-app-context-content">
    <div className="label">Workspace</div>
    <button type="button" className="hq-nav-page active" aria-current="page">{activeApp} Overview</button>
    <p>This app workspace has not been connected. The shortcut is saved, but no automation or application functions have been enabled.</p>
   </div>}
  </aside>}
  <main className="hq-dual-main" onClick={()=>{if(accountMenuOpen)setAccountMenuOpen(false);}}>
   {activeApp!=="MyFounderHQ"?<section className="hq-source-page">
     <div className="eyebrow">APPLICATION WORKSPACE</div><h1>{activeApp}</h1>
     <div className="hq-source-panel"><h2>Workspace not configured</h2><p>This application has been added to your launcher. Its pages, integrations, and execution workflows have not been connected yet.</p></div>
    </section>
    :page==="Businesses"?<BusinessPlanner userId={userId}/>
    :page==="Employees"?<AIEmployeeDirectory userId={userId}/>
    :page==="Account"?<AccountSettings userId={userId} initialEmail={email} signOutAction={signOutAction}/>
    :(isTool||isResource)?<section className="hq-source-page"><div className="eyebrow">{isResource?"RESOURCES":"BULK CREATION"}</div><h1>{page}</h1><div className="hq-source-panel"><h2>Not configured</h2><p>{isResource?"This resource library has not been configured yet. No screenshots or templates are shown.":"This automation has not been built or connected. No accounts or projects have been created, and no browser actions are running."}</p></div></section>
    :current?<AirtableTab tab={current}/>:null}
  </main>
  {manageLauncher&&<div className="hq-launcher-dialog-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setManageLauncher(false);}}>
   <section className="hq-launcher-dialog" role="dialog" aria-modal="true" aria-labelledby="launcher-dialog-title">
    <div className="hq-launcher-dialog-head"><h2 id="launcher-dialog-title">Customize app launcher</h2><button type="button" aria-label="Close" onClick={()=>setManageLauncher(false)}>✕</button></div>
    <p>Choose apps to show on the icon rail. Changes are saved to your MyFounderHQ account.</p>
    <div className="hq-launcher-manage-list">
     {appShortcuts.map((app,index)=><div key={app} className="hq-launcher-manage-row"><span className="hq-context-mark">{appMonogram(app)}</span><strong>{app}</strong>
       <button type="button" aria-label={"Move "+app+" up"} disabled={savingLauncher||index<2} onClick={()=>shiftShortcut(app,-1)}>↑</button>
       <button type="button" aria-label={"Move "+app+" down"} disabled={savingLauncher||index===0||index===appShortcuts.length-1} onClick={()=>shiftShortcut(app,1)}>↓</button>
       <button type="button" aria-label={"Remove "+app} disabled={savingLauncher||app==="MyFounderHQ"} onClick={()=>removeShortcut(app)}>Remove</button>
      </div>)}
    </div>
    <form onSubmit={e=>{e.preventDefault();addShortcut();}} className="hq-launcher-add-form">
     <label htmlFor="launcher-app-name">Add app shortcut</label>
     <div><input id="launcher-app-name" autoFocus value={newAppName} maxLength={56} placeholder="e.g. Ultimate Fan" onChange={e=>setNewAppName(e.target.value)}/>
     <button type="submit" disabled={savingLauncher||!newAppName.trim()||appShortcuts.includes(newAppName.trim())}>Add</button></div>
    </form>
    {launcherError&&<p className="hq-nav-error" role="alert">{launcherError}</p>}
    <button type="button" className="hq-launcher-done" onClick={()=>setManageLauncher(false)}>Done</button>
   </section>
  </div>}
 </div>;
}
