"use client";
import React,{useCallback,useEffect,useMemo,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";

type ReferenceApp={id:string;name:string;android_package:string;platform:string;description:string;device_model:string;assigned_employee_template_id:number|null;created_at:string};
type Screenshot={id:string;app_id:string;screen_name:string;storage_path:string;original_name:string;capture_method:"Upload"|"ADB";device_name:string;sequence_number:number;created_at:string};
const BUCKET="hq-reference-screenshots";
const ACCEPTED=new Set(["image/png","image/jpeg","image/webp"]);
const MAX_SIZE=10*1024*1024;
const HUMAN="Mobile App Developer";

export default function AppScreenshotLibrary({userId}:{userId:string}){
 const db=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),[]);
 const [apps,setApps]=useState<ReferenceApp[]>([]);
 const [screens,setScreens]=useState<Screenshot[]>([]);
 const [urls,setUrls]=useState<Record<string,string>>({});
 const [selectedId,setSelectedId]=useState("");
 const [query,setQuery]=useState("");
 const [createOpen,setCreateOpen]=useState(false);
 const [newName,setNewName]=useState("");
 const [newPackage,setNewPackage]=useState("");
 const [newPlatform,setNewPlatform]=useState("Android");
 const [device,setDevice]=useState("Samsung Galaxy S9");
 const [description,setDescription]=useState("");
 const [screenName,setScreenName]=useState("");
 const [uploads,setUploads]=useState<File[]>([]);
 const [inputKey,setInputKey]=useState(0);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [preview,setPreview]=useState<Screenshot|null>(null);
 const [employeeId,setEmployeeId]=useState<number|null>(null);
 const [sourceFilter,setSourceFilter]=useState("All");
 const selected=apps.find(a=>a.id===selectedId)||null;

 const reload=useCallback(async()=>{
  const [a,s,employee]=await Promise.all([
   db.from("hq_reference_apps").select("*").eq("user_id",userId).order("created_at",{ascending:false}),
   db.from("hq_reference_screenshots").select("*").eq("user_id",userId).order("created_at",{ascending:false}),
   db.from("hq_ai_employee_templates").select("id,name").eq("name",HUMAN).maybeSingle()
  ]);
  if(a.error||s.error){setError(a.error?.message||s.error?.message||"Unable to load screenshot library");}
  else{
   setApps((a.data||[]) as ReferenceApp[]);
   setScreens((s.data||[]) as Screenshot[]);
   setSelectedId(current=>current&&a.data?.some(x=>x.id===current)?current:(a.data?.[0]?.id||""));
  }
  if(employee.data?.id)setEmployeeId(employee.data.id as number);
  setLoading(false);
 },[db,userId]);
 useEffect(()=>{void reload();},[reload]);
 const visibleScreens=screens.filter(s=>s.app_id===selectedId&&(sourceFilter==="All"||s.capture_method===sourceFilter))
   .filter(s=>!query||[s.screen_name,s.original_name,s.device_name].some(x=>x.toLowerCase().includes(query.toLowerCase())));
 useEffect(()=>{
  if(visibleScreens.length===0)return;
  let active=true;
  const missing=visibleScreens.filter(s=>!urls[s.id]);
  if(missing.length===0)return;
  void (async()=>{
   const updates:Record<string,string>={};
   for(const s of missing){
    const {data,error}=await db.storage.from(BUCKET).createSignedUrl(s.storage_path,3600);
    if(!error&&data?.signedUrl)updates[s.id]=data.signedUrl;
   }
   if(active)setUrls(prev=>({...prev,...updates}));
  })();
  return()=>{active=false;};
 // Only refresh signed URLs when screenshot identity changes or app selection changes.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[db,selectedId,screens,sourceFilter,query]);
 const resetMessage=()=>{setError("");setSuccess("");};
 async function createApp(e:React.FormEvent){
  e.preventDefault();if(!newName.trim()||busy)return;
  resetMessage();setBusy(true);
  const {data,error}=await db.from("hq_reference_apps").insert({
   user_id:userId,name:newName.trim(),android_package:newPackage.trim(),platform:newPlatform,
   device_model:device.trim(),description:description.trim(),assigned_employee_template_id:employeeId
  }).select().single();
  if(error)setError(error.message);
  else{setCreateOpen(false);setNewName("");setNewPackage("");setDescription("");await reload();setSelectedId(data.id);setSuccess("Reference app created.");}
  setBusy(false);
 }
 async function uploadScreens(e:React.FormEvent){
  e.preventDefault();if(!selected||uploads.length===0||busy)return;
  resetMessage();
  const bad=uploads.find(f=>!ACCEPTED.has(f.type)||f.size<1||f.size>MAX_SIZE);
  if(bad){setError("Each screenshot must be PNG, JPEG, or WebP and no larger than 10 MB.");return;}
  setBusy(true);let count=0;
  for(let index=0;index<uploads.length;index++){
   const file=uploads[index];
   const path=userId+"/"+selected.id+"/"+crypto.randomUUID()+"."+(file.type==="image/png"?"png":file.type==="image/jpeg"?"jpg":"webp");
   const {error:storageError}=await db.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
   if(storageError){setError("Upload stopped at "+file.name+": "+storageError.message);break;}
   const title=uploads.length===1&&screenName.trim()?screenName.trim():file.name.replace(/\.[^.]+$/,"");
   const {error:metadataError}=await db.from("hq_reference_screenshots").insert({
    user_id:userId,app_id:selected.id,storage_path:path,screen_name:title.slice(0,180),
    original_name:file.name.slice(0,240),capture_method:"Upload",device_name:selected.device_model,
    file_size:file.size,sequence_number:screens.filter(s=>s.app_id===selected.id).length+index+1
   });
   if(metadataError){await db.storage.from(BUCKET).remove([path]);setError("Screenshot metadata could not be saved: "+metadataError.message);break;}
   count++;
  }
  if(count){setSuccess(count+" screenshot"+(count===1?"":"s")+" saved to Supabase.");setUploads([]);setScreenName("");setInputKey(k=>k+1);}
  await reload();setBusy(false);
 }
 async function deleteScreen(s:Screenshot){
  if(busy||!window.confirm("Permanently delete this screenshot?"))return;
  resetMessage();setBusy(true);
  const {error:storageError}=await db.storage.from(BUCKET).remove([s.storage_path]);
  if(storageError){setError(storageError.message);setBusy(false);return;}
  const {error:databaseError}=await db.from("hq_reference_screenshots").delete().eq("id",s.id).eq("user_id",userId);
  if(databaseError)setError("The image was removed, but the record could not be cleaned up: "+databaseError.message);
  else{setUrls(prev=>{const next={...prev};delete next[s.id];return next;});setSuccess("Screenshot removed.");setPreview(null);}
  await reload();setBusy(false);
 }
 async function deleteApp(app:ReferenceApp){
  if(busy||!window.confirm("Delete "+app.name+" and ALL its stored screenshots? This cannot be undone."))return;
  resetMessage();setBusy(true);
  const files=screens.filter(s=>s.app_id===app.id).map(s=>s.storage_path);
  if(files.length){
   const {error:storageError}=await db.storage.from(BUCKET).remove(files);
   if(storageError){setError(storageError.message);setBusy(false);return;}
  }
  const {error:appError}=await db.from("hq_reference_apps").delete().eq("id",app.id).eq("user_id",userId);
  if(appError)setError(appError.message);else setSuccess("Reference app and its screenshots removed.");
  await reload();setBusy(false);
 }
 return <section className="hq-shot-library">
  <div className="eyebrow">MEDIA MAGIC · REFERENCE MATERIAL</div>
  <div className="hq-shot-page-header"><div><h1>App Screenshot Library</h1><p>Capture real app screens. Organize them into reference kits for your Mobile App Developer.</p></div>
   <button className="hq-shot-primary" type="button" onClick={()=>setCreateOpen(true)}>+ Add reference app</button></div>
  <div className="hq-shot-meta"><span>{apps.length} reference apps</span><span>{screens.length} screenshots</span><span>Supabase private storage</span><span>Assigned role: {HUMAN}</span></div>
  {error&&<p className="hq-shot-alert" role="alert">{error}</p>}
  {success&&<p className="hq-shot-success" role="status">{success}</p>}
  {loading?<p role="status">Loading screenshot library…</p>:<div className="hq-shot-layout">
   <aside className="hq-shot-apps" aria-label="Reference applications"><h2>Reference apps</h2>
    {!apps.length&&<p>No reference apps yet. Add one to create its screenshot collection.</p>}
    {apps.map(a=><button type="button" key={a.id} className={"hq-shot-app"+(selectedId===a.id?" current":"")} onClick={()=>{setSelectedId(a.id);setQuery("");setSourceFilter("All");}}>
      <span className="hq-shot-app-initial">{a.name.slice(0,1).toUpperCase()}</span>
      <span><strong>{a.name}</strong><small>{a.platform} · {screens.filter(s=>s.app_id===a.id).length} screens</small></span>
    </button>)}
   </aside>
   <div className="hq-shot-content">
    {selected?<><div className="hq-shot-section-head"><div><h2>{selected.name}</h2><p>{selected.android_package||selected.platform} {selected.device_model?"· "+selected.device_model:""}</p></div>
      <button className="hq-shot-danger" type="button" disabled={busy} onClick={()=>void deleteApp(selected)}>Remove app</button></div>
     <div className="hq-shot-capture-panel"><h3>Add screenshots</h3>
      <form onSubmit={uploadScreens}><label>Screen name (optional for single upload)<input value={screenName} maxLength={180} placeholder="e.g. Home feed, Comments dialog" onChange={e=>setScreenName(e.target.value)}/></label>
       <label>Image files<input key={inputKey} type="file" multiple required accept="image/png,image/jpeg,image/webp" onChange={e=>setUploads(Array.from(e.target.files||[]))}/></label>
       <button className="hq-shot-primary" type="submit" disabled={busy||uploads.length===0}>{busy?"Saving…":"Upload "+(uploads.length||"")+" screenshot"+(uploads.length===1?"":"s")}</button>
      </form>
      <p className="hq-shot-help">Upload a screenshot here, or capture on your Acer with ADB and the authenticated uploader. Each screenshot becomes a private Supabase record. Nothing is imported from your phone without you starting the capture.</p>
     </div>
     <div className="hq-shot-toolbar"><h3>Captured screens</h3>
       <div><input aria-label="Search screenshots" placeholder="Search screenshots…" value={query} onChange={e=>setQuery(e.target.value)}/>
       <select aria-label="Capture method" value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}><option>All</option><option>ADB</option><option>Upload</option></select></div>
     </div>
     {visibleScreens.length===0?<div className="hq-shot-empty">No screenshots match this collection yet.</div>:<div className="hq-shot-grid">
      {visibleScreens.map(s=><article className="hq-shot-card" key={s.id}>
       <button className="hq-shot-image-button" type="button" onClick={()=>setPreview(s)} aria-label={"Preview "+(s.screen_name||s.original_name)}>{urls[s.id]?<img loading="lazy" src={urls[s.id]} alt={s.screen_name||s.original_name}/>:<span>Loading preview…</span>}</button>
       <div className="hq-shot-caption"><strong>{s.screen_name||s.original_name}</strong><small>{s.capture_method} · {s.device_name||"Unknown device"}</small><button type="button" disabled={busy} onClick={()=>void deleteScreen(s)}>Remove</button></div>
      </article>)}
     </div>}
    </>:<div className="hq-shot-empty">Select a reference app to start.</div>}
   </div>
  </div>}
  {createOpen&&<div className="hq-shot-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setCreateOpen(false);}}><section className="hq-shot-modal" role="dialog" aria-modal="true" aria-labelledby="hq-new-reference-title">
   <div className="hq-shot-modal-head"><h2 id="hq-new-reference-title">Add reference app</h2><button type="button" aria-label="Close" onClick={()=>setCreateOpen(false)}>×</button></div>
   <form onSubmit={createApp}><label>App name<input required maxLength={120} autoFocus placeholder="e.g. Instagram, Uber Driver" value={newName} onChange={e=>setNewName(e.target.value)}/></label>
    <label>Platform<select value={newPlatform} onChange={e=>setNewPlatform(e.target.value)}>{["Android","iOS","Web","Other"].map(p=><option key={p}>{p}</option>)}</select></label>
    <label>Android package name (optional)<input maxLength={180} placeholder="e.g. com.instagram.android" value={newPackage} onChange={e=>setNewPackage(e.target.value)}/></label>
    <label>Device<input maxLength={100} value={device} onChange={e=>setDevice(e.target.value)}/></label>
    <label>Reference notes<textarea rows={2} value={description} onChange={e=>setDescription(e.target.value)}/></label>
    <p className="hq-shot-help">The Mobile App Developer role is linked to this library; no AI agent or ADB connection is running automatically.</p>
    <div className="hq-shot-modal-actions"><button type="button" onClick={()=>setCreateOpen(false)}>Cancel</button><button className="hq-shot-primary" disabled={busy}>{busy?"Saving…":"Create reference app"}</button></div>
   </form>
  </section></div>}
  {preview&&<div className="hq-shot-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setPreview(null);}}><section className="hq-shot-preview" role="dialog" aria-modal="true" aria-label={"Screenshot: "+preview.screen_name}>
    <div className="hq-shot-modal-head"><h2>{preview.screen_name||preview.original_name}</h2><button type="button" onClick={()=>setPreview(null)} aria-label="Close preview">×</button></div>
    {urls[preview.id]?<img src={urls[preview.id]} alt={preview.screen_name||preview.original_name}/>:<p>Loading screenshot…</p>}
   </section></div>}
 </section>;
}
