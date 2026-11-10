"use client";
import React,{useCallback,useEffect,useMemo,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";

type Department={id:number;name:string;sort_order:number};
type Template={id:number;department_id:number;name:string;sort_order:number;description:string;responsibilities:string;skills:string;operating_procedures:string};
type Instance={id:string;user_id:string;template_id:number;business_id:string|null;status:"Configured"|"Connected"|"Tested"|"Operational";description:string;responsibilities:string;ai_model:string;technology_stack:string;connected_tools:string;skills:string;operating_procedures:string;memory:string;permissions:string;approval_requirements:string;current_tasks:string;execution_status:string;performance_metrics:string;completed_deliverables:string;notes:string};
type Business={id:string;name:string};
type Event={id:string;instance_id:string;event_type:string;title:string;detail:string;status:string;created_at:string};
const fields=[
 ["description","Job description"],["responsibilities","Responsibilities"],["ai_model","AI model"],["technology_stack","Technology stack"],["connected_tools","Tools & integrations (configuration notes)"],["skills","Skills"],["operating_procedures","Operating procedures"],["memory","Persistent memory notes"],["permissions","Permissions"],["approval_requirements","Approval requirements"],["current_tasks","Current tasks (notes)"],["execution_status","Execution status (notes)"],["performance_metrics","Performance metrics"],["completed_deliverables","Completed deliverables"],["notes","Additional notes"]
] as const;
type EditableField=typeof fields[number][0];
const defaultFields:Record<EditableField,string>={description:"",responsibilities:"",ai_model:"",technology_stack:"",connected_tools:"",skills:"",operating_procedures:"",memory:"",permissions:"",approval_requirements:"",current_tasks:"",execution_status:"Not connected",performance_metrics:"",completed_deliverables:"",notes:""};
export default function AIEmployeeDirectory({userId}:{userId:string}){
 const db=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),[]);
 const [departments,setDepartments]=useState<Department[]>([]);
 const [templates,setTemplates]=useState<Template[]>([]);
 const [instances,setInstances]=useState<Instance[]>([]);
 const [businesses,setBusinesses]=useState<Business[]>([]);
 const [events,setEvents]=useState<Event[]>([]);
 const [selected,setSelected]=useState<number|null>(null);
 const [scope,setScope]=useState<string>("master");
 const [form,setForm]=useState<Record<EditableField,string>>({...defaultFields});
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [query,setQuery]=useState("");
 const [eventType,setEventType]=useState<"task"|"history"|"memory"|"deliverable">("task");
 const [eventTitle,setEventTitle]=useState("");
 const [eventDetail,setEventDetail]=useState("");
 const [newEvent,setNewEvent]=useState(false);
 const reload=useCallback(async()=>{
  setLoading(true);setError("");
  const [d,t,i,b]=await Promise.all([
   db.from("hq_ai_departments").select("*").order("sort_order"),
   db.from("hq_ai_employee_templates").select("*").order("id"),
   db.from("hq_ai_employee_instances").select("*").eq("user_id",userId),
   db.from("hq_businesses").select("id,name").eq("user_id",userId).order("name")
  ]);
  const failure=[d,t,i,b].find(x=>x.error);
  if(failure?.error)setError(failure.error.message);
  else{setDepartments((d.data||[]) as Department[]);setTemplates((t.data||[]) as Template[]);setInstances((i.data||[]) as Instance[]);setBusinesses((b.data||[]) as Business[]);}
  setLoading(false);
 },[db,userId]);
 useEffect(()=>{void reload();},[reload]);
 const selectedTemplate=templates.find(t=>t.id===selected);
 const scopedInstance=instances.find(i=>i.template_id===selected&&(scope==="master"?i.business_id===null:i.business_id===scope));
 const masterInstance=instances.find(i=>i.template_id===selected&&i.business_id===null);
 useEffect(()=>{
  if(selected===null)return;
  const template=templates.find(t=>t.id===selected);
  const instance=instances.find(i=>i.template_id===selected&&(scope==="master"?i.business_id===null:i.business_id===scope));
  const next={...defaultFields};
  for(const [field] of fields)next[field]=instance?.[field]||((scope==="master"&&template&&["description","responsibilities","skills","operating_procedures"].includes(field))?String(template[field as "description"|"responsibilities"|"skills"|"operating_procedures"]||""):"");
  setForm(next);setSuccess("");setError("");setNewEvent(false);
 },[selected,scope,instances,templates]);
 const refreshEvents=useCallback(async(instanceId:string)=>{
  const {data,error}=await db.from("hq_ai_employee_events").select("*").eq("user_id",userId).eq("instance_id",instanceId).order("created_at",{ascending:false});
  if(error)setError(error.message);else setEvents((data||[]) as Event[]);
 },[db,userId]);
 useEffect(()=>{if(scopedInstance)void refreshEvents(scopedInstance.id);else setEvents([]);},[scopedInstance?.id,refreshEvents]);
 const choose=(id:number)=>{setSelected(id);setScope("master");setSuccess("");setError("");};
 const saveProfile=async(e:React.FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(selected===null)return;
  setSaving(true);setError("");setSuccess("");
  const payload={...form,user_id:userId,template_id:selected,business_id:scope==="master"?null:scope};
  // Status remains Configured; an actual agent connection and verified execution are required to promote it.
  const result=scopedInstance
   ?await db.from("hq_ai_employee_instances").update({...form,updated_at:new Date().toISOString()}).eq("id",scopedInstance.id).eq("user_id",userId)
   :await db.from("hq_ai_employee_instances").insert({...payload,status:"Configured"});
  if(result.error)setError(result.error.message);
  else{setSuccess("Profile saved.");await reload();}
  setSaving(false);
 };
 const createBusinessInstance=async(businessId:string)=>{
  if(selected===null||!businessId)return;
  const existing=instances.find(i=>i.template_id===selected&&i.business_id===businessId);
  if(existing){setScope(businessId);return;}
  setSaving(true);setError("");
  const {error}=await db.from("hq_ai_employee_instances").insert({user_id:userId,template_id:selected,business_id:businessId,status:"Configured",description:masterInstance?.description||"",responsibilities:masterInstance?.responsibilities||""});
  if(error)setError(error.message);else{await reload();setScope(businessId);}
  setSaving(false);
 };
 const addEvent=async(e:React.FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!scopedInstance||!eventTitle.trim())return;
  setSaving(true);setError("");
  const {error}=await db.from("hq_ai_employee_events").insert({user_id:userId,instance_id:scopedInstance.id,event_type:eventType,title:eventTitle.trim(),detail:eventDetail.trim(),status:"Recorded"});
  if(error)setError(error.message);else{setEventTitle("");setEventDetail("");setNewEvent(false);await refreshEvents(scopedInstance.id);}
  setSaving(false);
 };
 const filtered=templates.filter(t=>t.name.toLowerCase().includes(query.toLowerCase())||departments.find(d=>d.id===t.department_id)?.name.toLowerCase().includes(query.toLowerCase()));
 return <section className="ai-directory">
  <div className="console-top"><div><div className="eyebrow">AI WORKFORCE</div><h1>My Employees</h1></div></div>
  <div className="ai-dir-intro"><span>{departments.length} departments</span><span>{templates.length} specialized roles</span><span>Directory configured — agents not yet operational</span></div>
  {error&&<div className="hq-error" role="alert">{error}<button type="button" onClick={()=>void reload()}>Retry</button></div>}
  {loading&&<p role="status">Loading workforce…</p>}
  <div className="ai-dir-filter"><label htmlFor="ai-employee-search">Find an employee</label><input id="ai-employee-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search roles or departments…" /></div>
  <div className="ai-departments">
   {departments.map(d=>{
    const people=filtered.filter(t=>t.department_id===d.id);
    if(!people.length)return null;
    return <section className="ai-dept" key={d.id}><div className="ai-dept-head"><strong>{d.name}</strong><span>{people.length} roles</span></div><div className="ai-roles">{people.map(t=><button type="button" className="ai-role" key={t.id} onClick={()=>choose(t.id)}><span className="ai-role-name">{t.name}</span><span className="ai-role-status">Configured</span></button>)}</div></section>;
   })}
  </div>
  {selectedTemplate&&<div className="console-overlay ai-profile-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null);}}>
   <div className="console-dialog ai-profile" role="dialog" aria-modal="true" aria-label={selectedTemplate.name+" profile"}>
    <div className="console-dialog-head"><div><div className="eyebrow">EMPLOYEE PROFILE</div><h2>{selectedTemplate.name}</h2><p>{departments.find(d=>d.id===selectedTemplate.department_id)?.name}</p></div><button type="button" onClick={()=>setSelected(null)} aria-label="Close profile">×</button></div>
    <div className="ai-profile-status"><strong>Configured</strong><span>Not connected or tested. No autonomous execution is enabled.</span></div>
    <div className="ai-instance-bar"><label htmlFor="ai-instance-scope">Profile context</label><select id="ai-instance-scope" value={scope} onChange={e=>setScope(e.target.value)}><option value="master">Master employee template</option>{instances.filter(i=>i.template_id===selected&&i.business_id).map(i=><option value={i.business_id!} key={i.id}>{businesses.find(b=>b.id===i.business_id)?.name||"Business instance"}</option>)}</select></div>
    <div className="ai-business-attach"><label htmlFor="ai-link-business">Assign this role to a business</label><select id="ai-link-business" value="" disabled={saving} onChange={e=>void createBusinessInstance(e.target.value)}><option value="">Choose business…</option>{businesses.filter(b=>!instances.some(i=>i.template_id===selected&&i.business_id===b.id)).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
    <form className="ai-profile-form" onSubmit={saveProfile}>
     {fields.map(([key,label])=><label key={key}>{label}<textarea rows={key==="responsibilities"||key==="operating_procedures"||key==="memory"?3:2} value={form[key]} onChange={e=>setForm(v=>({...v,[key]:e.target.value}))} placeholder="Not configured" /></label>)}
     <div className="ai-profile-save">{success&&<span role="status">{success}</span>}<button type="submit" disabled={saving} className="console-primary">{saving?"Saving…":"Save profile"}</button></div>
    </form>
    <section className="ai-activity">
     <div className="ai-activity-head"><h3>Task & activity history</h3><button type="button" onClick={()=>setNewEvent(v=>!v)} disabled={!scopedInstance}>{newEvent?"Cancel":"+ Add record"}</button></div>
     {newEvent&&scopedInstance&&<form className="console-form" onSubmit={addEvent}><label>Record type<select value={eventType} onChange={e=>setEventType(e.target.value as typeof eventType)}><option value="task">Task</option><option value="history">History</option><option value="memory">Memory</option><option value="deliverable">Deliverable</option></select></label><label>Title<input required value={eventTitle} onChange={e=>setEventTitle(e.target.value)}/></label><label>Details<textarea rows={3} value={eventDetail} onChange={e=>setEventDetail(e.target.value)}/></label><button className="console-primary" type="submit" disabled={saving}>Save record</button></form>}
     {!scopedInstance?<p>Save this profile to record activity.</p>:events.length===0?<p>No activity recorded.</p>:events.map(ev=><div className="ai-event" key={ev.id}><strong>{ev.title}</strong><small>{ev.event_type} · {new Date(ev.created_at).toLocaleDateString("en-CA")}</small>{ev.detail&&<p>{ev.detail}</p>}</div>)}
    </section>
   </div>
  </div>}
 </section>;
}
