"use client";
import React,{useCallback,useEffect,useMemo,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";

type Website={id:string;name:string;website_url:string;description:string;created_at:string};
type Shot={id:string;website_id:string;storage_path:string;original_name:string;screen_name:string;viewport:string;page_url:string;created_at:string};
const BUCKET="hq-reference-websites";
const ALLOWED=new Set(["image/png","image/jpeg","image/webp"]);

export default function WebsiteScreenshotLibrary({userId}:{userId:string}){
 const db=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),[]);
 const [websites,setWebsites]=useState<Website[]>([]);
 const [shots,setShots]=useState<Shot[]>([]);
 const [selectedId,setSelectedId]=useState("");
 const [signed,setSigned]=useState<Record<string,string>>({});
 const [name,setName]=useState("");
 const [url,setUrl]=useState("");
 const [note,setNote]=useState("");
 const [title,setTitle]=useState("");
 const [pageUrl,setPageUrl]=useState("");
 const [viewport,setViewport]=useState("Desktop");
 const [files,setFiles]=useState<File[]>([]);
 const [fileKey,setFileKey]=useState(0);
 const [query,setQuery]=useState("");
 const [modal,setModal]=useState(false);
 const [preview,setPreview]=useState<Shot|null>(null);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const selected=websites.find(x=>x.id===selectedId);
 const matches=shots.filter(s=>s.website_id===selectedId)
   .filter(s=>!query||[s.screen_name,s.original_name,s.viewport,s.page_url].some(t=>t.toLowerCase().includes(query.toLowerCase())));
 const load=useCallback(async()=>{
  const [w,s]=await Promise.all([
   db.from("hq_reference_websites").select("*").eq("user_id",userId).order("created_at",{ascending:false}),
   db.from("hq_reference_website_screenshots").select("*").eq("user_id",userId).order("created_at",{ascending:false})
  ]);
  if(w.error||s.error)setError(w.error?.message||s.error?.message||"Unable to load website library.");
  else{
   setWebsites((w.data||[]) as Website[]);setShots((s.data||[]) as Shot[]);
   setSelectedId(old=>old&&(w.data||[]).some(x=>x.id===old)?old:(w.data?.[0]?.id||""));
  }
  setLoading(false);
 },[db,userId]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{
  let active=true;
  const todo=matches.filter(s=>!signed[s.id]);
  if(!todo.length)return;
  void (async()=>{
   const result:Record<string,string>={};
   for(const shot of todo){
    const {data,error}=await db.storage.from(BUCKET).createSignedUrl(shot.storage_path,1800);
    if(!error&&data?.signedUrl)result[shot.id]=data.signedUrl;
   }
   if(active)setSigned(old=>({...old,...result}));
  })();
  return()=>{active=false;};
 // Screenshot IDs are stable during a gallery refresh.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[db,shots,selectedId,query]);
 const clear=()=>{setError("");setNotice("");};
 async function createWebsite(e:React.FormEvent){
  e.preventDefault();if(busy)return;clear();
  let normalized:string;
  try{const parsed=new URL(url.trim());if(parsed.protocol!=="https:"||!parsed.hostname.includes("."))throw Error();normalized=parsed.toString();}
  catch{setError("Enter a valid HTTPS website address.");return;}
  setBusy(true);
  const {data,error}=await db.from("hq_reference_websites").insert({user_id:userId,name:name.trim(),website_url:normalized,description:note.trim()}).select().single();
  if(error)setError(error.message);
  else{setModal(false);setName("");setUrl("");setNote("");await load();setSelectedId(data.id);setNotice("Website collection created.");}
  setBusy(false);
 }
 async function upload(e:React.FormEvent){
  e.preventDefault();if(!selected||!files.length||busy)return;clear();
  const invalid=files.find(f=>!ALLOWED.has(f.type)||f.size===0||f.size>10485760);
  if(invalid){setError("Use PNG, JPEG or WebP screenshots no larger than 10 MB.");return;}
  if(pageUrl.trim()){
   try{const u=new URL(pageUrl);if(u.protocol!=="https:")throw Error();}
   catch{setError("Page URL must be a valid HTTPS address.");return;}
  }
  setBusy(true);let saved=0;
  for(const file of files){
   const ext=file.type==="image/png"?"png":file.type==="image/jpeg"?"jpg":"webp";
   const path=userId+"/"+selected.id+"/"+crypto.randomUUID()+"."+ext;
   const {error:uploadError}=await db.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError){setError("Upload failed for "+file.name+": "+uploadError.message);break;}
   const screen=files.length===1&&title.trim()?title.trim():file.name.replace(/\.[^.]+$/,"");
   const {error:recordError}=await db.from("hq_reference_website_screenshots").insert({
    user_id:userId,website_id:selected.id,storage_path:path,original_name:file.name.slice(0,240),
    screen_name:screen.slice(0,180),viewport,page_url:pageUrl.trim(),file_size:file.size
   });
   if(recordError){await db.storage.from(BUCKET).remove([path]);setError("Could not save screenshot details: "+recordError.message);break;}
   saved++;
  }
  if(saved){setNotice(saved+" screenshot"+(saved===1?"":"s")+" saved to Supabase.");setFiles([]);setTitle("");setFileKey(v=>v+1);}
  await load();setBusy(false);
 }
 async function removeShot(shot:Shot){
  if(busy||!window.confirm("Delete this screenshot permanently?"))return;
  clear();setBusy(true);
  const {error:e}=await db.storage.from(BUCKET).remove([shot.storage_path]);
  if(e)setError(e.message);
  else{
   const {error:recordError}=await db.from("hq_reference_website_screenshots").delete().eq("id",shot.id).eq("user_id",userId);
   if(recordError)setError("Image deleted but metadata cleanup failed: "+recordError.message);
   else{setSigned(prev=>{const next={...prev};delete next[shot.id];return next;});setPreview(null);setNotice("Screenshot deleted.");}
  }
  await load();setBusy(false);
 }
 async function removeWebsite(site:Website){
  if(busy||!window.confirm("Delete "+site.name+" and all its screenshots permanently?"))return;
  clear();setBusy(true);
  const paths=shots.filter(s=>s.website_id===site.id).map(s=>s.storage_path);
  for(let i=0;i<paths.length;i+=50){
   const {error:e}=await db.storage.from(BUCKET).remove(paths.slice(i,i+50));
   if(e){setError("File cleanup failed: "+e.message);setBusy(false);return;}
  }
  const {error:e}=await db.from("hq_reference_websites").delete().eq("id",site.id).eq("user_id",userId);
  if(e)setError(e.message);else setNotice("Website collection removed.");
  await load();setBusy(false);
 }
 return <section className="hq-shot-library">
  <div className="eyebrow">MEDIA MAGIC · WEBSITE REFERENCES</div>
  <div className="hq-shot-page-header"><div><h1>Website Screenshot Library</h1><p>Organize website references into reusable visual kits for the Web Developer and UI/UX Designer.</p></div>
   <button className="hq-shot-primary" type="button" onClick={()=>{clear();setModal(true);}}>+ Add website</button></div>
  <div className="hq-shot-meta"><span>{websites.length} websites</span><span>{shots.length} screenshots</span><span>Private Supabase Storage</span><span>Web Developer · UI/UX Designer</span></div>
  {error&&<p className="hq-shot-alert" role="alert">{error}</p>}
  {notice&&<p className="hq-shot-success" role="status">{notice}</p>}
  {loading?<p role="status">Loading websites…</p>:<div className="hq-shot-layout">
   <aside className="hq-shot-apps" aria-label="Reference websites"><h2>Websites</h2>
    {!websites.length&&<p>No websites yet. Add your first reference.</p>}
    {websites.map(site=><button type="button" key={site.id} className={"hq-shot-app"+(selectedId===site.id?" current":"")} onClick={()=>{setSelectedId(site.id);setQuery("");}}>
     <span className="hq-shot-app-initial">W</span><span><strong>{site.name}</strong><small>{shots.filter(s=>s.website_id===site.id).length} screenshots</small></span>
    </button>)}
   </aside>
   <div className="hq-shot-content">{selected?<>
    <div className="hq-shot-section-head"><div><h2>{selected.name}</h2><p><a href={selected.website_url} target="_blank" rel="noopener noreferrer">{selected.website_url}</a></p></div>
     <button className="hq-shot-danger" disabled={busy} type="button" onClick={()=>void removeWebsite(selected)}>Remove website</button>
    </div>
    <div className="hq-shot-capture-panel"><h3>Upload website screenshots</h3>
     <form onSubmit={upload}>
      <label>Screenshot name<input maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Homepage desktop"/></label>
      <label>Viewport<select value={viewport} onChange={e=>setViewport(e.target.value)}><option>Desktop</option><option>Tablet</option><option>Mobile</option><option>Other</option></select></label>
      <label>Image files<input required key={fileKey} type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e=>setFiles(Array.from(e.target.files||[]))}/></label>
      <label>Page URL (optional)<input value={pageUrl} onChange={e=>setPageUrl(e.target.value)} placeholder="https://example.com/page"/></label>
      <button className="hq-shot-primary" disabled={busy||!files.length} type="submit">{busy?"Saving…":"Upload screenshots"}</button>
     </form>
     <p className="hq-shot-help">Manual uploads are operational. Browser screenshot automation has not been connected; no screenshots are captured without your action. Maximum 10 MB per image.</p>
    </div>
    <div className="hq-shot-toolbar"><h3>Saved screens</h3><div><input placeholder="Search screenshot names…" aria-label="Search screenshots" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
    {!matches.length?<div className="hq-shot-empty">No screenshots yet for this website.</div>:<div className="hq-shot-grid">
     {matches.map(shot=><article className="hq-shot-card" key={shot.id}>
      <button type="button" className="hq-shot-image-button" onClick={()=>setPreview(shot)} aria-label={"View "+shot.screen_name}>
       {signed[shot.id]?<img src={signed[shot.id]} alt={shot.screen_name||shot.original_name} loading="lazy"/>:<span>Loading image…</span>}
      </button>
      <div className="hq-shot-caption"><strong>{shot.screen_name||shot.original_name}</strong><small>{shot.viewport}</small><button disabled={busy} type="button" onClick={()=>void removeShot(shot)}>Remove</button></div>
     </article>)}
    </div>}
   </>:<div className="hq-shot-empty">Select or add a website to begin.</div>}</div>
  </div>}
  {modal&&<div className="hq-shot-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false);}}><section role="dialog" aria-modal="true" aria-labelledby="new-website-title" className="hq-shot-modal">
   <div className="hq-shot-modal-head"><h2 id="new-website-title">Add reference website</h2><button aria-label="Close" type="button" onClick={()=>setModal(false)}>×</button></div>
   <form onSubmit={createWebsite}>
    <label>Website name<input required maxLength={120} autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Notion"/></label>
    <label>Website URL<input required type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com"/></label>
    <label>Reference notes<textarea rows={2} value={note} onChange={e=>setNote(e.target.value)}/></label>
    <div className="hq-shot-modal-actions"><button type="button" onClick={()=>setModal(false)}>Cancel</button><button disabled={busy||!name.trim()||!url.trim()} type="submit" className="hq-shot-primary">{busy?"Creating…":"Create website"}</button></div>
   </form>
  </section></div>}
  {preview&&<div className="hq-shot-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setPreview(null);}}><section className="hq-shot-preview" role="dialog" aria-modal="true" aria-label={"Preview "+preview.screen_name}>
   <div className="hq-shot-modal-head"><h2>{preview.screen_name||preview.original_name}</h2><button type="button" aria-label="Close" onClick={()=>setPreview(null)}>×</button></div>
   {signed[preview.id]?<img src={signed[preview.id]} alt={preview.screen_name||preview.original_name}/>:<p>Loading preview…</p>}
  </section></div>}
 </section>;
}
