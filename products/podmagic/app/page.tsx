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
 const [rightSidebarOpen,setRightSidebarOpen]=useState(true);
 const [profileOpen,setProfileOpen]=useState(false);
 const [settingsOpen,setSettingsOpen]=useState(false);


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
 return <div className="pod-triple-shell">
  <nav className="pod-icon-rail" aria-label="Application launcher">
   <button type="button" className="pod-rail-icon pod-menu-icon" onClick={()=>setSidebarOpen(open=>!open)} aria-expanded={sidebarOpen} title={sidebarOpen?"Hide left menu":"Show left menu"} aria-label={sidebarOpen?"Hide left menu":"Show left menu"}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9"/><path d="M9 21v-7h6v7"/></svg></button>
   <div className="pod-rail-separator"/>
   <div className="pod-rail-end">
    <button type="button" className="pod-profile-circle" title="Account menu" aria-label="Open account menu" aria-expanded={profileOpen} onClick={()=>setProfileOpen(open=>!open)}>
     {(user.email||"P").slice(0,1).toUpperCase()}
    </button>
   </div>
  </nav>
  {sidebarOpen&&<aside className="pod-left-context" aria-label="POD Magic navigation">
   <div className="pod-context-head">
    <div className="pod-context-identity"/>
    <button type="button" className="pod-collapse-button" onClick={()=>setSidebarOpen(false)} aria-label="Collapse left sidebar" title="Collapse left sidebar">‹</button>
   </div>
   <div className="pod-context-empty" aria-label="POD Magic navigation items"/>
  </aside>}
  {profileOpen&&<>
   <button type="button" className="pod-profile-dismiss" aria-label="Close account menu" onClick={()=>setProfileOpen(false)}/>
   <div className="pod-profile-popover" role="group" aria-label="POD Magic account menu">
    <div className="pod-profile-menu-head"><span className="pod-profile-menu-avatar">{(user.email||"P").slice(0,1).toUpperCase()}</span><span><strong>{user.email?.split("@")[0]||"My account"}</strong><small>{user.email}</small></span></div>
    <div className="pod-profile-menu-divider"/>
    <button type="button" onClick={()=>{setProfileOpen(false);setSettingsOpen(true);}}><span aria-hidden="true">⚙</span> Settings</button>
    <button type="button" onClick={()=>{setProfileOpen(false);void signOut();}}><span aria-hidden="true">⇥</span> Log out</button>
   </div>
  </>}
  <main className="studio-main">
   <header className="topbar pod-empty-header"><span/><div className="topbar-right"><button type="button" className="pod-right-toggle" onClick={()=>setRightSidebarOpen(open=>!open)} title={rightSidebarOpen?"Hide right sidebar":"Show right sidebar"} aria-label={rightSidebarOpen?"Hide right sidebar":"Show right sidebar"} aria-expanded={rightSidebarOpen}>◧</button></div></header>
   <div className="pod-blank-workspace" aria-label="Empty POD Magic workspace"/>
  </main>
  {settingsOpen&&<div className="pod-settings-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSettingsOpen(false);}}>
   <section className="pod-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="pod-settings-title">
    <div className="pod-settings-dialog-head"><h2 id="pod-settings-title">Settings</h2><button type="button" onClick={()=>setSettingsOpen(false)} aria-label="Close settings">×</button></div>
    <h3>Account</h3>
    <div className="pod-setting-row"><span>Email</span><strong>{user.email}</strong></div>
    <div className="pod-setting-row"><span>Signed in</span><strong>POD Magic</strong></div>
    <p>Account credentials are shared with MyFounderHQ. Additional POD Magic settings will appear here as features are added.</p>
    <button type="button" className="pod-signout-action" onClick={()=>{setSettingsOpen(false);void signOut();}}>Log out</button>
   </section>
  </div>}
  {rightSidebarOpen&&<aside className="pod-right-context" aria-label="Empty contextual sidebar">
   <div className="pod-right-head"><span/><button className="pod-collapse-button" type="button" onClick={()=>setRightSidebarOpen(false)} aria-label="Collapse right sidebar" title="Collapse right sidebar">›</button></div>
   <div className="pod-right-body"/>
  </aside>}
 </div>;
}
