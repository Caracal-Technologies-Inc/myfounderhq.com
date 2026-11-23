"use client";
import React,{useCallback,useEffect,useMemo,useState} from "react";
import {createClient, type User} from "@supabase/supabase-js";

type Product="T-shirt"|"Hoodie"|"Mug"|"Poster"|"Tote bag"|"Phone case"|"Other";
type Status="Draft"|"In design"|"Ready for review"|"Approved"|"Published";
type Design={id:string;user_id:string;title:string;product_type:Product;niche:string;headline:string;tagline:string;background_color:string;text_color:string;accent_color:string;notes:string;canva_url:string;status:Status;created_at:string;updated_at:string};
type DesignDraft=Omit<Design,"id"|"user_id"|"created_at"|"updated_at">;
const products:Product[]=["T-shirt","Hoodie","Mug","Poster","Tote bag","Phone case","Other"];
const statuses:Status[]=["Draft","In design","Ready for review","Approved","Published"];
const blank:DesignDraft={title:"New merch design",product_type:"T-shirt",niche:"",headline:"CREATE SOMETHING",tagline:"POD MAGIC",background_color:"#18132E",text_color:"#FFFFFF",accent_color:"#F2C66D",notes:"",canva_url:"",status:"Draft"};
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&key?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const isCanvaUrl=(value:string)=>{if(!value)return true;try{const u=new URL(value);return u.protocol==="https:"&&(u.hostname==="canva.com"||u.hostname.endsWith(".canva.com"));}catch{return false;}};
function DesignCanvas({design}:{design:DesignDraft}){
 return <div className="design-preview" style={{background:design.background_color,color:design.text_color}}>
  <span className="preview-sparkle" style={{color:design.accent_color}}>✦</span>
  <div className="preview-main"><span className="preview-caption" style={{color:design.accent_color}}>POD MAGIC ORIGINAL</span><strong>{design.headline||"YOUR DESIGN"}</strong><span className="preview-line" style={{background:design.accent_color}}/><em>{design.tagline||"Add a tagline"}</em></div>
  <small>DESIGN CONCEPT · {design.product_type.toUpperCase()}</small>
 </div>;
}
export default function Home(){
 const db=supabase;
 const [user,setUser]=useState<User|null>(null);
 const [authLoading,setAuthLoading]=useState(true);
 const [authMode,setAuthMode]=useState<"login"|"signup"|"reset">("login");
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [authBusy,setAuthBusy]=useState(false);
 const [authMessage,setAuthMessage]=useState("");
 const [screen,setScreen]=useState<"dashboard"|"designs"|"editor"|"billing"|"settings">("dashboard");
 const [designs,setDesigns]=useState<Design[]>([]);
 const [designsLoading,setDesignsLoading]=useState(false);
 const [editor,setEditor]=useState<DesignDraft>({...blank});
 const [editingId,setEditingId]=useState<string|null>(null);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [filter,setFilter]=useState("");
 const [sidebarOpen,setSidebarOpen]=useState(true);

 useEffect(()=>{if(!db){setAuthLoading(false);return;}let active=true;
  void db.auth.getUser().then(({data})=>{if(active){setUser(data.user);setAuthLoading(false);}});
  const {data:{subscription}}=db.auth.onAuthStateChange((_event,session)=>{if(active)setUser(session?.user||null);});
  return()=>{active=false;subscription.unsubscribe();};
 },[db]);
 const refresh=useCallback(async()=>{
  if(!db||!user)return;setDesignsLoading(true);setError("");
  const {data,error}=await db.from("podmagic_designs").select("*").eq("user_id",user.id).order("updated_at",{ascending:false});
  if(error)setError("Could not load designs: "+error.message);else setDesigns(data as Design[]||[]);
  setDesignsLoading(false);
 },[db,user]);
 useEffect(()=>{if(user)void refresh();else setDesigns([]);},[user,refresh]);
 const begin=(design?:Design)=>{setEditingId(design?.id||null);setEditor(design?{title:design.title,product_type:design.product_type,niche:design.niche,headline:design.headline,tagline:design.tagline,background_color:design.background_color,text_color:design.text_color,accent_color:design.accent_color,notes:design.notes,canva_url:design.canva_url,status:design.status}:{...blank});setError("");setNotice("");setScreen("editor");};
 const go=(next:typeof screen)=>{setScreen(next);setError("");setNotice("");};
 const setField=<K extends keyof DesignDraft>(field:K,value:DesignDraft[K])=>setEditor(current=>({...current,[field]:value}));
 async function authenticate(e:React.FormEvent){
  e.preventDefault();if(!db||authBusy)return;setAuthBusy(true);setAuthMessage("");
  let error;
  if(authMode==="login")({error}=await db.auth.signInWithPassword({email:email.trim(),password}));
  else if(authMode==="signup")({error}=await db.auth.signUp({email:email.trim(),password}));
  else ({error}=await db.auth.resetPasswordForEmail(email.trim()));
  setAuthBusy(false);
  if(error)setAuthMessage(error.message);
  else if(authMode==="signup")setAuthMessage("Account request submitted. If email confirmation is enabled, check your inbox before signing in.");
  else if(authMode==="reset")setAuthMessage("If this email has an account, password-reset instructions have been sent.");
  else{setPassword("");setAuthMessage("");}
 }
 async function saveDesign(e:React.FormEvent){
  e.preventDefault();if(!db||!user||saving)return;
  setError("");setNotice("");if(!editor.title.trim()){setError("Design title is required.");return;}
  if(!isCanvaUrl(editor.canva_url)){setError("Use a valid HTTPS Canva design URL, or leave the field blank.");return;}
  setSaving(true);
  const values={...editor,title:editor.title.trim(),headline:editor.headline.trim(),tagline:editor.tagline.trim(),niche:editor.niche.trim(),canva_url:editor.canva_url.trim(),notes:editor.notes.trim(),updated_at:new Date().toISOString()};
  const result=editingId?await db.from("podmagic_designs").update(values).eq("id",editingId).eq("user_id",user.id).select("id").single():await db.from("podmagic_designs").insert({...values,user_id:user.id}).select("id").single();
  setSaving(false);if(result.error){setError(result.error.message);return;}
  setEditingId(result.data.id);setNotice("Design saved to your POD Magic workspace.");await refresh();
 }
 async function removeDesign(){
  if(!db||!user||!editingId||saving||!window.confirm("Delete this design permanently?"))return;
  setSaving(true);const {error}=await db.from("podmagic_designs").delete().eq("id",editingId).eq("user_id",user.id);
  setSaving(false);if(error){setError(error.message);return;}await refresh();go("designs");
 }
 async function duplicateDesign(design:Design){
  if(!db||!user)return;const {id,user_id,created_at,updated_at,...content}=design;
  const {error}=await db.from("podmagic_designs").insert({...content,user_id:user.id,title:content.title+" (copy)",status:"Draft"});
  if(error)setError(error.message);else{setNotice("Design duplicated.");await refresh();}
 }
 async function signOut(){if(!db)return;await db.auth.signOut();setScreen("dashboard");}
 const filtered=designs.filter(d=>[d.title,d.niche,d.product_type,d.status].some(v=>v.toLowerCase().includes(filter.toLowerCase())));
 const approved=designs.filter(d=>d.status==="Approved"||d.status==="Published").length;
 if(!db)return <main className="config-error">POD Magic is not yet configured. Missing public database configuration.</main>;
 if(authLoading)return <main className="loading-screen">Loading POD Magic…</main>;
 if(!user)return <div className="welcome-shell"><section className="welcome-brand"><div className="brand"><span className="brand-mark">✦</span>POD MAGIC<span className="trademark">™</span></div><div className="welcome-copy"><span className="eyebrow">MERCHANDISE DESIGN OPERATING SYSTEM</span><h1>Your next collection starts here.</h1><p>Create original concepts, manage your design pipeline, and prepare your merchandise projects for Canva and print-on-demand fulfillment.</p><div className="welcome-pills"><span>Design studio</span><span>Merch collections</span><span>Production workflow</span></div></div><p className="welcome-footer">A Magic™ product · Connected to MyFounderHQ</p></section>
 <section className="auth-panel"><div className="auth-box"><div className="auth-kicker">WELCOME TO POD MAGIC</div><h2>{authMode==="login"?"Sign in to your studio":authMode==="signup"?"Create your account":"Reset your password"}</h2><p>Access your private design workspace.</p><form onSubmit={authenticate}><label>Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>{authMode!=="reset"&&<label>Password<input required minLength={6} type="password" autoComplete={authMode==="signup"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password"/></label>}<button disabled={authBusy} className="primary-button">{authBusy?"Working…":authMode==="login"?"Sign in":authMode==="signup"?"Create account":"Email reset instructions"}</button></form>{authMessage&&<p className="form-message" role="status">{authMessage}</p>}<div className="auth-links"><button type="button" onClick={()=>{setAuthMode(authMode==="login"?"signup":"login");setAuthMessage("");}}>{authMode==="login"?"Create an account":"Back to sign in"}</button>{authMode==="login"&&<button type="button" onClick={()=>{setAuthMode("reset");setAuthMessage("");}}>Forgot password?</button>}</div><p className="auth-foot">POD Magic currently uses the same Supabase authentication project as MyFounderHQ, so existing founder credentials can be used.</p></div></section>
 </div>;
 return <div className={"studio-shell"+(!sidebarOpen?" sidebar-closed":"")}>
  <aside className="studio-side"><div className="side-head"><div className="brand"><span className="brand-mark">✦</span><span className="brand-text">POD MAGIC™</span></div><button title="Toggle sidebar" aria-label="Toggle sidebar" onClick={()=>setSidebarOpen(v=>!v)}>☰</button></div>
   <div className="nav-items">{([["dashboard","▦","Overview"],["designs","▤","My designs"],["editor","✚","New design"],["billing","◇","Subscription"],["settings","⚙","Account"]] as const).map(([id,icon,label])=><button key={id} title={label} className={screen===id?"selected":""} onClick={()=>id==="editor"?begin():go(id)}><span>{icon}</span><b>{label}</b></button>)}</div>
   <div className="side-foot"><a href="https://myfounderhq.com" target="_blank" rel="noopener noreferrer" title="Go to MyFounderHQ">↗ <span>MyFounderHQ</span></a><small>{user.email}</small><button onClick={()=>void signOut()}>⇥ <span>Log out</span></button></div>
  </aside>
  <main className="studio-main">
   <header className="topbar"><button className="menu-toggle" title="Toggle menu" onClick={()=>setSidebarOpen(v=>!v)}>☰</button><span>WORKSPACE / {screen.toUpperCase()}</span><div className="topbar-right"><span className="status-dot"/> Studio access <strong>{user.email?.split("@")[0]}</strong></div></header>
   <div className="page-content">
    {error&&<div className="alert error" role="alert">{error}</div>}
    {notice&&<div className="alert success" role="status">{notice}</div>}
    {screen==="dashboard"&&<><div className="page-heading"><div><span className="eyebrow">DESIGN OPERATING SYSTEM</span><h1>Welcome to POD Magic.</h1><p>Turn an idea into a production-ready merch project, one design at a time.</p></div><button className="primary-button" onClick={()=>begin()}>+ Create design</button></div>
     <div className="stats"><div><span>Saved designs</span><strong>{designs.length}</strong></div><div><span>Approved / published</span><strong>{approved}</strong></div><div><span>Connected Canva designs</span><strong>{designs.filter(d=>d.canva_url).length}</strong></div></div>
     <div className="split-panels"><section className="panel"><div className="panel-header"><h2>Recent designs</h2><button onClick={()=>go("designs")}>View all</button></div>{designsLoading?<p>Loading designs…</p>:designs.length?designs.slice(0,5).map(d=><button className="list-design" key={d.id} onClick={()=>begin(d)}><span className="mini-art" style={{background:d.background_color,color:d.text_color}}>✦</span><span><strong>{d.title}</strong><small>{d.product_type} · {d.status}</small></span><span>›</span></button>):<div className="empty-small">No designs yet. Create your first merch concept.</div>}</section>
     <section className="panel"><h2>Production pathway</h2><div className="pathway"><p><strong>01 — Concept</strong><br/>Create and save your design brief.</p><p><strong>02 — Canva</strong><br/>Build the final artwork in Canva, then attach its design link.</p><p><strong>03 — Approval</strong><br/>Review the files before listing merchandise.</p><p><strong>04 — Fulfillment</strong><br/>Print provider integrations will be configured separately.</p></div></section></div>
    </>}
    {screen==="designs"&&<><div className="page-heading"><div><span className="eyebrow">DESIGN LIBRARY</span><h1>My designs</h1><p>Your saved merchandise concepts, stored in Supabase.</p></div><button className="primary-button" onClick={()=>begin()}>+ New design</button></div><div className="search-row"><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search designs, niches, products…" aria-label="Search designs"/><span>{filtered.length} designs</span></div>{designsLoading?<p>Loading…</p>:filtered.length?<div className="design-grid">{filtered.map(d=><article className="design-card" key={d.id}><div className="design-thumb" style={{background:d.background_color,color:d.text_color}}><span style={{color:d.accent_color}}>✦</span><strong>{d.headline||d.title}</strong><small>{d.tagline}</small></div><div className="design-card-info"><span className="status-label">{d.status}</span><h3>{d.title}</h3><p>{d.product_type} · {d.niche||"Uncategorized"}</p><div><button onClick={()=>begin(d)}>Edit design</button><button onClick={()=>void duplicateDesign(d)}>Duplicate</button></div></div></article>)}</div>:<div className="empty-state"><strong>No saved designs found</strong><p>Start with a new idea and build your POD catalog.</p><button className="primary-button" onClick={()=>begin()}>Create design</button></div>}</>}
    {screen==="editor"&&<><div className="page-heading"><div><span className="eyebrow">DESIGN STUDIO</span><h1>{editingId?"Edit design":"Create a merch concept"}</h1><p>Design briefs and previews are saved here. Canva editing is opened separately.</p></div><button className="outline-button" onClick={()=>go("designs")}>Back to designs</button></div>
     <div className="editor-layout"><form id="design-form" className="panel design-form" onSubmit={saveDesign}><h2>Design details</h2><label>Design title<input required maxLength={140} value={editor.title} onChange={e=>setField("title",e.target.value)}/></label><div className="form-row"><label>Product<select value={editor.product_type} onChange={e=>setField("product_type",e.target.value as Product)}>{products.map(x=><option key={x}>{x}</option>)}</select></label><label>Status<select value={editor.status} onChange={e=>setField("status",e.target.value as Status)}>{statuses.map(x=><option key={x}>{x}</option>)}</select></label></div><label>Niche / collection<input maxLength={120} value={editor.niche} onChange={e=>setField("niche",e.target.value)} placeholder="e.g. Football culture, Space cats"/></label><label>Headline<input maxLength={150} value={editor.headline} onChange={e=>setField("headline",e.target.value)}/></label><label>Tagline<input maxLength={150} value={editor.tagline} onChange={e=>setField("tagline",e.target.value)}/></label>
     <div className="form-row colors"><label>Background<input type="color" value={editor.background_color} onChange={e=>setField("background_color",e.target.value)}/></label><label>Text<input type="color" value={editor.text_color} onChange={e=>setField("text_color",e.target.value)}/></label><label>Accent<input type="color" value={editor.accent_color} onChange={e=>setField("accent_color",e.target.value)}/></label></div><label>Production notes<textarea rows={3} value={editor.notes} onChange={e=>setField("notes",e.target.value)}/></label><h2>Canva handoff</h2><label>Canva design link<input type="url" value={editor.canva_url} placeholder="https://www.canva.com/design/..." onChange={e=>setField("canva_url",e.target.value)}/></label><p className="form-hint">Paste an existing Canva design link. OAuth synchronization and embedded Canva app authorization are not yet configured.</p><div className="actions"><button className="primary-button" disabled={saving}>{saving?"Saving…":"Save design"}</button>{editingId&&<button className="danger-button" type="button" onClick={()=>void removeDesign()} disabled={saving}>Delete</button>}</div></form>
     <aside className="preview-column"><div className="panel"><div className="panel-header"><h2>Live concept preview</h2><span className="preview-tag">{editor.product_type}</span></div><DesignCanvas design={editor}/><p className="preview-note">Visual concept only. Product print files require final artwork and proper DPI/bleed specifications.</p></div><div className="panel canva-panel"><h2>Continue in Canva</h2><p>Use Canva to create and edit finished artwork. Save its design URL here to keep the project connected to your POD Magic record.</p><div className="actions"><a href={editor.canva_url&&isCanvaUrl(editor.canva_url)?editor.canva_url:"https://www.canva.com/"} target="_blank" rel="noopener noreferrer" className="primary-button">{editor.canva_url?"Open linked design":"Open Canva ↗"}</a></div><small>Direct Canva API access requires registering and authorizing a developer integration.</small></div></aside></div>
    </>}
    {screen==="billing"&&<><span className="eyebrow">ACCOUNT & BILLING</span><h1>Subscription</h1><p>POD Magic's subscription plans and payment collection will be connected here.</p><div className="panel billing-panel"><h2>Founder workspace</h2><div className="price"><strong>Development access</strong><span>Payment processing not enabled</span></div><p>No Stripe subscription has been created or charged by this website.</p><p>Pricing, plan entitlements, checkout, invoices, and customer billing portal require production Stripe configuration.</p></div></>}
    {screen==="settings"&&<><span className="eyebrow">MY ACCOUNT</span><h1>Account</h1><section className="panel account-panel"><h2>Signed-in account</h2><p><strong>Email:</strong> {user.email}</p><p><strong>Account ID:</strong> <code>{user.id}</code></p><p>POD Magic uses the same authentication backend as MyFounderHQ. Your design projects remain private to your account.</p><button className="outline-button" onClick={()=>void signOut()}>Sign out</button></section></>}
   </div>
  </main>
 </div>;
}
