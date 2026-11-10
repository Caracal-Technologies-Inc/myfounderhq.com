"use client";
import React,{useCallback,useEffect,useMemo,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";

type Document={id:string;document_type:string;original_name:string;storage_path:string;created_at:string};
type DocType="Passport"|"National identity card"|"Driver license"|"Other";
export default function FounderIdentity({userId}:{userId:string}){
 const db=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),[]);
 const [fullName,setFullName]=useState("");
 const [birthDate,setBirthDate]=useState("");
 const [documents,setDocuments]=useState<Document[]>([]);
 const [docType,setDocType]=useState<DocType>("Passport");
 const [file,setFile]=useState<File|null>(null);
 const [fileInputKey,setFileInputKey]=useState(0);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 const load=useCallback(async(preserveEdits=false)=>{
  setLoading(true);setError("");
  const [profile,docs]=await Promise.all([
   db.from("hq_founder_profiles").select("full_name,date_of_birth").eq("user_id",userId).maybeSingle(),
   db.from("hq_identity_documents").select("id,document_type,original_name,storage_path,created_at").eq("user_id",userId).order("created_at",{ascending:false})
  ]);
  if(profile.error||docs.error){setError(profile.error?.message||docs.error?.message||"Unable to load your profile.");}
  else{if(!preserveEdits){setFullName(profile.data?.full_name||"");setBirthDate(profile.data?.date_of_birth||"");}setDocuments((docs.data||[]) as Document[]);}
  setLoading(false);
 },[db,userId]);
 useEffect(()=>{void load()},[load]);
 async function saveProfile(e:React.FormEvent){
  e.preventDefault();setError("");setNotice("");
  if(birthDate&&birthDate>new Date().toISOString().slice(0,10)){setError("Date of birth cannot be in the future.");return;}
  setBusy(true);
  const {error}=await db.from("hq_founder_profiles").upsert({user_id:userId,full_name:fullName.trim(),date_of_birth:birthDate||null,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(error)setError(error.message);else setNotice("Founder details saved.");
  setBusy(false);
 }
 async function uploadDocument(e:React.FormEvent){
  e.preventDefault();setError("");setNotice("");
  if(!file)return;
  const formats=["application/pdf","image/jpeg","image/png","image/webp"];
  if(file.size>10*1024*1024||file.size===0||!formats.includes(file.type)){setError("Choose a PDF, JPG, PNG, or WebP file up to 10 MB.");return;}
  setBusy(true);
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-120);
  const path=userId+"/"+crypto.randomUUID()+"-"+(safeName||"document");
  const {error:uploadError}=await db.storage.from("hq-identity-documents").upload(path,file,{contentType:file.type,upsert:false});
  if(uploadError){setError(uploadError.message);setBusy(false);return;}
  const {error:metaError}=await db.from("hq_identity_documents").insert({user_id:userId,document_type:docType,original_name:file.name,storage_path:path,mime_type:file.type,size_bytes:file.size});
  if(metaError){await db.storage.from("hq-identity-documents").remove([path]);setError(metaError.message);}
  else{setNotice("Identity document uploaded securely.");setFile(null);setFileInputKey(n=>n+1);await load(true);}
  setBusy(false);
 }
 async function openDocument(doc:Document){
  setError("");
  const {data,error}=await db.storage.from("hq-identity-documents").createSignedUrl(doc.storage_path,60);
  if(error||!data?.signedUrl){setError(error?.message||"Document could not be opened.");return;}
  window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }
 async function removeDocument(doc:Document){
  if(!window.confirm("Permanently delete "+doc.original_name+"?"))return;
  setBusy(true);setError("");setNotice("");
  const {error:storageError}=await db.storage.from("hq-identity-documents").remove([doc.storage_path]);
  if(storageError){setError(storageError.message);setBusy(false);return;}
  const {error:metaError}=await db.from("hq_identity_documents").delete().eq("id",doc.id).eq("user_id",userId);
  if(metaError)setError("File removed, but record cleanup failed: "+metaError.message);
  else{setNotice("Document removed.");await load(true);}
  setBusy(false);
 }
 return <div className="card settings-section founder-identity">
  <h3>Founder Identity</h3>
  <form onSubmit={saveProfile} className="founder-details-form">
   <label>Full name<input type="text" maxLength={180} autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Enter full legal name"/></label>
   <label>Date of birth<input type="date" max={new Date().toISOString().slice(0,10)} value={birthDate} onChange={e=>setBirthDate(e.target.value)}/></label>
   <button className="settings-action-button" type="submit" disabled={busy||loading}>{busy?"Saving…":"Save details"}</button>
  </form>
  <div className="founder-document-section">
   <h4>Identity documents</h4>
   <p className="founder-privacy-caption">Private documents. Only your signed-in account can access them. Upload only documents you intend to store.</p>
   <form className="founder-document-form" onSubmit={uploadDocument}>
    <label>Document type<select value={docType} onChange={e=>setDocType(e.target.value as DocType)}>{["Passport","National identity card","Driver license","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Choose a file<input key={fileInputKey} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" required onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
    <button className="settings-action-button" type="submit" disabled={busy||!file}>{busy?"Uploading…":"Upload document"}</button>
   </form>
   <p className="founder-privacy-caption">PDF or image files, maximum 10 MB each.</p>
   {loading?<p role="status">Loading documents…</p>:documents.length===0?<p className="founder-privacy-caption">No identity documents uploaded.</p>:<div className="founder-document-list">{documents.map(d=><div className="founder-document-row" key={d.id}><span><strong>{d.document_type}</strong><small>{d.original_name}</small></span><button type="button" disabled={busy} onClick={()=>void openDocument(d)}>View</button><button type="button" disabled={busy} onClick={()=>void removeDocument(d)}>Remove</button></div>)}</div>}
  </div>
  {error&&<p className="settings-inline-message settings-inline-error" role="alert">{error}</p>}
  {notice&&<p className="settings-inline-message settings-inline-success" role="status">{notice}</p>}
 </div>;
}
