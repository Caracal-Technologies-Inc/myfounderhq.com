"use client";
import React,{useCallback,useEffect,useMemo,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";

type Department={id:number;name:string;sort_order:number};
type Template={id:number;department_id:number;name:string;sort_order:number};
type Instance={id:string;template_id:number;business_id:string|null;status:string};
type Task={id:string;instance_id:string;event_type:string;title:string;detail:string;status:string;created_at:string};
type Connector={id:string;instance_id:string;provider:string;state:string;notes:string};
export default function AIEmployeeDirectory({userId}:{userId:string}){
 const db=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),[]);
 const [departments,setDepartments]=useState<Department[]>([]);
 const [templates,setTemplates]=useState<Template[]>([]);
 const [instances,setInstances]=useState<Instance[]>([]);
 const [selected,setSelected]=useState<Template|null>(null);
 const [tasks,setTasks]=useState<Task[]>([]);
 const [connectors,setConnectors]=useState<Connector[]>([]);
 const [taskName,setTaskName]=useState("");
 const [provider,setProvider]=useState("");
 const [loading,setLoading]=useState(true);
 const [detailLoading,setDetailLoading]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [modalError,setModalError]=useState("");
 const [listTab,setListTab]=useState<"tasks"|"connectors">("tasks");
 const selectedInstance=selected?instances.find(i=>i.template_id===selected.id&&i.business_id===null):undefined;
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  const [d,t,i]=await Promise.all([
   db.from("hq_ai_departments").select("id,name,sort_order").order("sort_order"),
   db.from("hq_ai_employee_templates").select("id,department_id,name,sort_order").order("id"),
   db.from("hq_ai_employee_instances").select("id,template_id,business_id,status").eq("user_id",userId).is("business_id",null)
  ]);
  const failed=[d,t,i].find(x=>x.error);
  if(failed?.error)setError(failed.error.message);
  else {setDepartments((d.data||[]) as Department[]);setTemplates((t.data||[]) as Template[]);setInstances((i.data||[]) as Instance[]);}
  setLoading(false);
 },[db,userId]);
 useEffect(()=>{void load()},[load]);
 const loadDetails=useCallback(async(id:string)=>{
  setDetailLoading(true);setModalError("");
  const [t,c]=await Promise.all([
   db.from("hq_ai_employee_events").select("id,instance_id,event_type,title,detail,status,created_at").eq("user_id",userId).eq("instance_id",id).eq("event_type","task").order("created_at",{ascending:false}),
   db.from("hq_ai_employee_connectors").select("id,instance_id,provider,state,notes").eq("user_id",userId).eq("instance_id",id).order("created_at")
  ]);
  const failed=[t,c].find(x=>x.error);
  if(failed?.error)setModalError(failed.error.message);
  else{setTasks((t.data||[]) as Task[]);setConnectors((c.data||[]) as Connector[]);}
  setDetailLoading(false);
 },[db,userId]);
 useEffect(()=>{if(selectedInstance)void loadDetails(selectedInstance.id);else{setTasks([]);setConnectors([]);}},[selectedInstance?.id,loadDetails]);
 const openEmployee=(t:Template)=>{setSelected(t);setTaskName("");setProvider("");setModalError("");setListTab("tasks");};
 async function addTask(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!selectedInstance||!taskName.trim())return;
  setSaving(true);setModalError("");
  const {error}=await db.from("hq_ai_employee_events").insert({user_id:userId,instance_id:selectedInstance.id,event_type:"task",title:taskName.trim(),detail:"",status:"Queued"});
  if(error)setModalError(error.message);else{setTaskName("");await loadDetails(selectedInstance.id);}
  setSaving(false);
 }
 async function deleteTask(t:Task){
  if(!selectedInstance||!window.confirm("Remove this task?"))return;
  setSaving(true);setModalError("");
  const {error}=await db.from("hq_ai_employee_events").delete().eq("id",t.id).eq("instance_id",selectedInstance.id).eq("user_id",userId);
  if(error)setModalError(error.message);else await loadDetails(selectedInstance.id);
  setSaving(false);
 }
 async function addConnector(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!selectedInstance||!provider.trim())return;
  setSaving(true);setModalError("");
  const {error}=await db.from("hq_ai_employee_connectors").insert({user_id:userId,instance_id:selectedInstance.id,provider:provider.trim(),state:"Not connected"});
  if(error)setModalError(error.message);else{setProvider("");await loadDetails(selectedInstance.id);}
  setSaving(false);
 }
 async function deleteConnector(c:Connector){
  if(!selectedInstance||!window.confirm("Remove "+c.provider+" from this employee?"))return;
  setSaving(true);setModalError("");
  const {error}=await db.from("hq_ai_employee_connectors").delete().eq("id",c.id).eq("instance_id",selectedInstance.id).eq("user_id",userId);
  if(error)setModalError(error.message);else await loadDetails(selectedInstance.id);
  setSaving(false);
 }
 return <section className="ai-simple">
  <div className="console-top"><div><div className="eyebrow">AI WORKFORCE</div><h1>My Employees</h1></div></div>
  {error&&<div className="hq-error" role="alert">{error}<button type="button" onClick={()=>void load()}>Retry</button></div>}
  {loading&&<p role="status">Loading employees…</p>}
  <div className="ai-simple-groups">
   {departments.map(d=><section className="ai-simple-dept" key={d.id}>
    <h2>{d.name}</h2>
    <div className="ai-simple-list">{templates.filter(t=>t.department_id===d.id).map(t=><button type="button" key={t.id} onClick={()=>openEmployee(t)}>{t.name}<span>›</span></button>)}</div>
   </section>)}
  </div>
  {selected&&<div className="console-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
   <div className="console-dialog ai-simple-modal" role="dialog" aria-modal="true" aria-label={selected.name}>
    <div className="console-dialog-head"><div><h2>{selected.name}</h2><p>{departments.find(d=>d.id===selected.department_id)?.name}</p></div><button type="button" onClick={()=>setSelected(null)} aria-label="Close">×</button></div>
    <div className="ai-simple-modal-tabs" role="tablist" aria-label="Employee controls">
     <button type="button" role="tab" aria-selected={listTab==="tasks"} className={listTab==="tasks"?"selected":""} onClick={()=>setListTab("tasks")}>Tasks</button>
     <button type="button" role="tab" aria-selected={listTab==="connectors"} className={listTab==="connectors"?"selected":""} onClick={()=>setListTab("connectors")}>Connectors</button>
    </div>
    {modalError&&<p role="alert" className="hq-file-error">{modalError}</p>}
    {!selectedInstance?<p>No employee record is available for this role.</p>:<>
     {detailLoading&&<p role="status">Loading…</p>}
     {listTab==="tasks"?<>
      <form className="ai-simple-entry" onSubmit={addTask}><input required maxLength={140} aria-label="Task name" placeholder="New task" value={taskName} onChange={e=>setTaskName(e.target.value)}/><button className="console-primary" type="submit" disabled={saving}>+ Add task</button></form>
      <div className="ai-simple-items">{!detailLoading&&tasks.length===0&&<p>No tasks yet.</p>}{tasks.map(t=><div className="ai-simple-item" key={t.id}><span>{t.title}</span><button type="button" disabled={saving} onClick={()=>void deleteTask(t)}>Remove</button></div>)}</div>
     </>:<>
      <form className="ai-simple-entry" onSubmit={addConnector}><input required maxLength={100} aria-label="Connector name" placeholder="Connector name, e.g. GitHub" value={provider} onChange={e=>setProvider(e.target.value)}/><button className="console-primary" type="submit" disabled={saving}>+ Add connector</button></form>
      <p className="ai-connector-note">Adding a connector lists it here. It does not authenticate or grant access to the service.</p>
      <div className="ai-simple-items">{!detailLoading&&connectors.length===0&&<p>No connectors yet.</p>}{connectors.map(c=><div className="ai-simple-item" key={c.id}><span>{c.provider}<small>{c.state}</small></span><button type="button" disabled={saving} onClick={()=>void deleteConnector(c)}>Remove</button></div>)}</div>
     </>}
    </>}
   </div>
  </div>}
 </section>;
}
