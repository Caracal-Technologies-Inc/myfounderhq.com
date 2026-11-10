"use client";
import React,{useCallback,useEffect,useMemo,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";

type Business={id:string;user_id:string;name:string;description:string;status:"Planning"|"Active"|"Paused"|"Launched"};
type BusinessTask={id:string;user_id:string;business_id:string;title:string;start_date:string|null;end_date:string|null;notes:string;status:"Planned"|"In progress"|"Review"|"Done"};
type Employee={id:string;user_id:string;name:string;role:string;department:string;instructions:string;status:"Candidate"|"Active"|"Paused"};
type Assignment={id:string;user_id:string;employee_id:string;assigned_date:string;title:string;details:string;status:"Queued"|"In progress"|"Review"|"Complete"};
const startDay=(d:Date)=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const moveDay=(d:Date,n:number)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const iso=(d:Date)=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const pretty=(d:Date)=>d.toLocaleDateString("en-CA",{month:"short",day:"numeric"});
const dayIndex=(s:string)=>Date.parse(s+"T12:00:00Z")/86400000;
const newBusiness={name:"",description:"",status:"Planning" as Business["status"]};
const newEmployee={name:"",role:"",department:"",status:"Candidate" as Employee["status"],instructions:""};

function useHQ(userId:string){
 const db=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),[]);
 const [businesses,setBusinesses]=useState<Business[]>([]);
 const [businessTasks,setBusinessTasks]=useState<BusinessTask[]>([]);
 const [employees,setEmployees]=useState<Employee[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const refresh=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const [b,t,e,a]=await Promise.all([
    db.from("hq_businesses").select("*").eq("user_id",userId).order("created_at"),
    db.from("hq_business_tasks").select("*").eq("user_id",userId).order("start_date"),
    db.from("hq_employees").select("*").eq("user_id",userId).order("created_at"),
    db.from("hq_employee_assignments").select("*").eq("user_id",userId).order("assigned_date")
   ]);
   const fail=[b,t,e,a].find(x=>x.error);
   if(fail?.error)throw fail.error;
   setBusinesses((b.data||[]) as Business[]);setBusinessTasks((t.data||[]) as BusinessTask[]);
   setEmployees((e.data||[]) as Employee[]);setAssignments((a.data||[]) as Assignment[]);
  }catch(err){setError(err instanceof Error?err.message:String(err));}finally{setLoading(false);}
 },[db,userId]);
 useEffect(()=>{void refresh();},[refresh]);
 const mutate=useCallback(async(operation:()=>PromiseLike<{error:{message:string}|null}>)=>{
  setError("");
  try{const result=await operation();if(result.error)throw Error(result.error.message);await refresh();return true;}
  catch(err){setError(err instanceof Error?err.message:String(err));return false;}
 },[refresh]);
 return {db,businesses,businessTasks,employees,assignments,loading,error,setError,refresh,mutate};
}

const pipelineStatuses=["Planned","In progress","Review","Done"] as const;
export function BusinessPlanner({userId}:{userId:string}){
 const h=useHQ(userId);
 const [view,setView]=useState<"board"|"setup">("board");
 const [entry,setEntry]=useState<Business|null|undefined>(undefined);
 const [form,setForm]=useState(newBusiness);
 const [task,setTask]=useState<BusinessTask|null|undefined>(undefined);
 const [taskBusiness,setTaskBusiness]=useState("");
 const [title,setTitle]=useState("");
 const [notes,setNotes]=useState("");
 const [status,setStatus]=useState<BusinessTask["status"]>("Planned");
 const [busy,setBusy]=useState(false);
 const openBusiness=(b:Business|null)=>{setForm(b?{name:b.name,description:b.description,status:b.status}:newBusiness);setEntry(b);};
 const openTask=(businessId:string,t:BusinessTask|null,stage:BusinessTask["status"]="Planned")=>{
  setTaskBusiness(businessId);setTask(t);setTitle(t?.title||"");setNotes(t?.notes||"");setStatus(t?.status||stage);
 };
 const saveBusiness=async(e:React.FormEvent)=>{e.preventDefault();if(!form.name.trim())return;setBusy(true);
  const values={name:form.name.trim(),description:form.description.trim(),status:form.status};
  const ok=await h.mutate(()=>entry?h.db.from("hq_businesses").update(values).eq("id",entry.id).eq("user_id",userId):h.db.from("hq_businesses").insert({...values,user_id:userId}));
  setBusy(false);if(ok)setEntry(undefined);
 };
 const saveTask=async(e:React.FormEvent)=>{e.preventDefault();if(!title.trim())return;setBusy(true);
  const values={business_id:taskBusiness,title:title.trim(),notes:notes.trim(),status};
  const ok=await h.mutate(()=>task?h.db.from("hq_business_tasks").update(values).eq("id",task.id).eq("user_id",userId):h.db.from("hq_business_tasks").insert({...values,user_id:userId}));
  setBusy(false);if(ok)setTask(undefined);
 };
 const changeStage=async(t:BusinessTask,next:BusinessTask["status"])=>{
  await h.mutate(()=>h.db.from("hq_business_tasks").update({status:next}).eq("id",t.id).eq("user_id",userId));
 };
 const removeBusiness=async()=>{if(!entry||!window.confirm("Permanently delete this business and all its tasks?"))return;setBusy(true);const ok=await h.mutate(()=>h.db.from("hq_businesses").delete().eq("id",entry.id).eq("user_id",userId));setBusy(false);if(ok)setEntry(undefined);};
 const removeTask=async()=>{if(!task||!window.confirm("Delete this task?"))return;setBusy(true);const ok=await h.mutate(()=>h.db.from("hq_business_tasks").delete().eq("id",task.id).eq("user_id",userId));setBusy(false);if(ok)setTask(undefined);};
 return <section className="planner business-console hq-live">
  <div className="console-top"><div><div className="eyebrow">BUSINESS CONTROL CENTER</div><h1>My Businesses</h1></div><button className="console-primary" type="button" onClick={()=>{setView("setup");openBusiness(null)}}>+ Add business</button></div>
  <div className="console-toolbar"><div className="console-switch"><button type="button" aria-pressed={view==="board"} className={view==="board"?"selected":""} onClick={()=>setView("board")}>▤ Operations view</button><button type="button" aria-pressed={view==="setup"} className={view==="setup"?"selected":""} onClick={()=>setView("setup")}>⚙ Business setup</button></div><span className="console-count">{h.businesses.length} businesses · {h.businessTasks.length} tasks · Supabase</span></div>
  {h.error&&<div className="hq-error" role="alert">{h.error}<button onClick={()=>void h.refresh()}>Retry</button></div>}
  {h.loading&&<p role="status">Syncing with Supabase…</p>}
  {view==="board"?<>
   <div className="console-hint"><strong>PORTFOLIO OPERATIONS</strong><span>Business names and controls remain pinned · Scroll horizontally through work stages</span></div>
   <div className="business-board-scroll" tabIndex={0} aria-label="Scrollable business operations board">
    <div className="business-board">
     <div className="business-board-head business-board-name-head">BUSINESS</div>
     <div className="business-board-head business-board-control-head">CONTROLS</div>
     {pipelineStatuses.map(s=><div className="business-board-head business-board-stage-head" key={s}>{s}</div>)}
     {h.businesses.map(b=><React.Fragment key={b.id}>
      <div className="business-board-name"><strong title={b.name}>{b.name}</strong></div>
      <div className="business-board-actions"><span className="business-board-status">{b.status}</span><div className="business-board-action-buttons"><button type="button" onClick={()=>openTask(b.id,null)}>+ Task</button><button type="button" onClick={()=>{setView("setup");openBusiness(b)}}>⚙ Setup</button></div></div>
      {pipelineStatuses.map(stage=><div className="business-board-lane" key={stage}>
       {h.businessTasks.filter(t=>t.business_id===b.id&&t.status===stage).map(t=><div className="business-board-task" key={t.id}>
        <button type="button" className="business-board-task-main" onClick={()=>openTask(b.id,t)}><strong>{t.title}</strong>{t.notes&&<span>{t.notes}</span>}</button>
        <div className="business-board-task-actions"><button type="button" title="Edit task" onClick={()=>openTask(b.id,t)}>Edit</button>
        {stage!=="Done"&&<button type="button" onClick={()=>void changeStage(t,pipelineStatuses[pipelineStatuses.indexOf(stage)+1])} title={"Move to next stage"}>Advance →</button>}</div>
       </div>)}
       <button type="button" className="business-board-add" onClick={()=>openTask(b.id,null,stage)}>+ Add task</button>
      </div>)}
     </React.Fragment>)}
    </div>
   </div>
   {!h.loading&&!h.businesses.length&&<div className="console-empty">No businesses yet. Use <strong>+ Add business</strong> to begin.</div>}
  </>:<div className="console-setup"><div className="console-setup-head"><div><h2>Business registry</h2><p>Configure businesses and direct their work.</p></div><button className="console-outline" type="button" onClick={()=>openBusiness(null)}>+ New business</button></div><div className="console-directory">{h.businesses.map(b=><div className="console-profile" key={b.id}><div className="console-profile-info"><strong>{b.name}</strong><span>{b.description||"No description"}</span><small>{b.status} · {h.businessTasks.filter(t=>t.business_id===b.id).length} tasks</small></div><button className="console-outline" type="button" onClick={()=>openTask(b.id,null)}>+ Task</button><button className="console-outline" type="button" onClick={()=>openBusiness(b)}>Configure</button></div>)}</div></div>}
  {entry!==undefined&&<div className="console-overlay"><div className="console-dialog" role="dialog" aria-modal="true" aria-label="Business editor"><div className="console-dialog-head"><h2>{entry?"Configure business":"Add business"}</h2><button type="button" onClick={()=>setEntry(undefined)} aria-label="Close">×</button></div><form className="console-form" onSubmit={saveBusiness}><label>Business name<input required maxLength={100} value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label><label>Description<input maxLength={180} value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))}/></label><label>Status<select value={form.status} onChange={e=>setForm(v=>({...v,status:e.target.value as Business["status"]}))}>{["Planning","Active","Paused","Launched"].map(x=><option key={x}>{x}</option>)}</select></label><div className="console-form-actions">{entry&&<button className="console-danger" type="button" disabled={busy} onClick={()=>void removeBusiness()}>Delete business</button>}<button className="console-outline" type="button" onClick={()=>setEntry(undefined)}>Cancel</button><button className="console-primary" type="submit" disabled={busy}>Save to Supabase</button></div></form></div></div>}
  {task!==undefined&&<div className="console-overlay"><div className="console-dialog" role="dialog" aria-modal="true" aria-label="Task editor"><div className="console-dialog-head"><h2>{task?"Edit task":"Add task"}</h2><button type="button" onClick={()=>setTask(undefined)} aria-label="Close">×</button></div><form className="console-form" onSubmit={saveTask}><label>Task title<input required maxLength={140} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Work stage<select value={status} onChange={e=>setStatus(e.target.value as BusinessTask["status"])}>{pipelineStatuses.map(s=><option key={s}>{s}</option>)}</select></label><label>Instructions<textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)}/></label><div className="console-form-actions">{task&&<button className="console-danger" type="button" disabled={busy} onClick={()=>void removeTask()}>Delete task</button>}<button className="console-outline" type="button" onClick={()=>setTask(undefined)}>Cancel</button><button className="console-primary" type="submit" disabled={busy}>Save to Supabase</button></div></form></div></div>}
 </section>;
}

export function EmployeePlanner({userId}:{userId:string}){
 const h=useHQ(userId);
 const [view,setView]=useState<"calendar"|"setup">("calendar");
 const [shift,setShift]=useState(0);
 const [entry,setEntry]=useState<Employee|null|undefined>(undefined);
 const [form,setForm]=useState(newEmployee);
 const [task,setTask]=useState<Assignment|null|undefined>(undefined);
 const [employeeId,setEmployeeId]=useState("");
 const [assignedDate,setAssignedDate]=useState("");
 const [title,setTitle]=useState("");
 const [details,setDetails]=useState("");
 const [status,setStatus]=useState<Assignment["status"]>("Queued");
 const [busy,setBusy]=useState(false);
 const today=startDay(new Date());
 const monday=moveDay(today,-((today.getDay()+6)%7)+shift*7);
 const dates=Array.from({length:7},(_,i)=>moveDay(monday,i));
 const openEmployee=(e:Employee|null)=>{setForm(e?{name:e.name,role:e.role,department:e.department,status:e.status,instructions:e.instructions}:newEmployee);setEntry(e);};
 const openTask=(id:string,date:string,t:Assignment|null)=>{setTask(t);setEmployeeId(id);setAssignedDate(date);setTitle(t?.title||"");setDetails(t?.details||"");setStatus(t?.status||"Queued");};
 const saveEmployee=async(e:React.FormEvent)=>{e.preventDefault();if(!form.name.trim()||!form.role.trim())return;setBusy(true);const values={name:form.name.trim(),role:form.role.trim(),department:form.department.trim(),instructions:form.instructions,status:form.status};
  const ok=await h.mutate(()=>entry?h.db.from("hq_employees").update(values).eq("id",entry.id).eq("user_id",userId):h.db.from("hq_employees").insert({...values,user_id:userId}));setBusy(false);if(ok)setEntry(undefined);
 };
 const saveTask=async(e:React.FormEvent)=>{e.preventDefault();if(!title.trim())return;setBusy(true);const values={employee_id:employeeId,assigned_date:assignedDate,title:title.trim(),details:details.trim(),status};
  const ok=await h.mutate(()=>task?h.db.from("hq_employee_assignments").update(values).eq("id",task.id).eq("user_id",userId):h.db.from("hq_employee_assignments").insert({...values,user_id:userId}));setBusy(false);if(ok)setTask(undefined);
 };
 const deleteEmployee=async()=>{if(!entry||!window.confirm("Delete employee and all assignments?"))return;setBusy(true);const ok=await h.mutate(()=>h.db.from("hq_employees").delete().eq("id",entry.id).eq("user_id",userId));setBusy(false);if(ok)setEntry(undefined);};
 const deleteTask=async()=>{if(!task||!window.confirm("Delete assignment?"))return;setBusy(true);const ok=await h.mutate(()=>h.db.from("hq_employee_assignments").delete().eq("id",task.id).eq("user_id",userId));setBusy(false);if(ok)setTask(undefined);};
 return <section className="planner employee-console hq-live">
  <div className="console-top"><div><div className="eyebrow">WORKFORCE CONTROL CENTER</div><h1>My Employees</h1></div><button className="console-primary" onClick={()=>{setView("setup");openEmployee(null)}}>+ Add employee</button></div>
  <div className="console-toolbar"><div className="console-switch"><button className={view==="calendar"?"selected":""} onClick={()=>setView("calendar")}>▦ Calendar view</button><button className={view==="setup"?"selected":""} onClick={()=>setView("setup")}>⚙ Employee setup</button></div><span className="console-count">{h.employees.length} employees · {h.assignments.length} assignments · Supabase</span>{view==="calendar"&&<div className="planner-controls"><button onClick={()=>setShift(n=>n-1)} aria-label="Previous week">‹</button><button onClick={()=>setShift(0)}>This week</button><button onClick={()=>setShift(n=>n+1)} aria-label="Next week">›</button></div>}</div>
  {h.error&&<div className="hq-error" role="alert">{h.error}<button onClick={()=>void h.refresh()}>Retry</button></div>}
  {h.loading&&<p role="status">Syncing with Supabase…</p>}
  {view==="calendar"?<>
   <div className="console-hint"><strong>WORKFORCE COMMAND GRID</strong><span>{pretty(dates[0])} – {pretty(dates[6])} · Scroll sideways through employee columns</span></div>
   <div className="console-scroll" tabIndex={0}><div className="console-grid" style={{gridTemplateColumns:"96px repeat("+h.employees.length+", minmax(265px, 300px))",minWidth:96+h.employees.length*265}}><div className="console-corner">DATE / TEAM</div>
    {h.employees.map(emp=><div className="console-employee-header" key={emp.id}><div className="console-employee-headrow"><span className="console-avatar">{emp.role.slice(0,2).toUpperCase()}</span><div className="console-employee-identity"><strong>{emp.name}</strong><span>{emp.role}</span></div><button onClick={()=>{setView("setup");openEmployee(emp)}} aria-label={"Configure "+emp.name}>⚙</button></div><div className="console-employee-meta"><span>{emp.status}</span><span>{emp.department||"No department"}</span></div></div>)}
    {dates.map(date=><React.Fragment key={iso(date)}><div className={"console-date "+(iso(date)===iso(today)?"is-today":"")}><strong>{date.toLocaleDateString("en-CA",{weekday:"short"})}</strong><span>{pretty(date)}</span></div>{h.employees.map(emp=><div className={"console-cell "+(iso(date)===iso(today)?"is-today":"")} key={emp.id+iso(date)}>{h.assignments.filter(t=>t.employee_id===emp.id&&t.assigned_date===iso(date)).map(t=><button className="console-task" key={t.id} onClick={()=>openTask(emp.id,t.assigned_date,t)}><strong>{t.title}</strong><small>{t.status}</small></button>)}<button className="console-cell-add" onClick={()=>openTask(emp.id,iso(date),null)}>+ Assign task</button></div>)}</React.Fragment>)}
   </div></div>
   {!h.loading&&!h.employees.length&&<div className="console-empty">No employees yet. Select <strong>+ Add employee</strong> to create one.</div>}
  </>:<div className="console-setup"><div className="console-setup-head"><div><h2>Employee registry</h2><p>Configure and manage your real employee records.</p></div><button className="console-outline" onClick={()=>openEmployee(null)}>+ New employee</button></div><div className="console-directory">{h.employees.map(emp=><div className="console-profile" key={emp.id}><span className="console-avatar">{emp.role.slice(0,2).toUpperCase()}</span><div className="console-profile-info"><strong>{emp.name}</strong><span>{emp.role}</span><small>{emp.department||"No department"} · {emp.status}</small></div><button className="console-outline" onClick={()=>openEmployee(emp)}>Configure</button></div>)}</div></div>}
  {entry!==undefined&&<div className="console-overlay"><div className="console-dialog" role="dialog" aria-modal="true" aria-label="Employee editor"><div className="console-dialog-head"><h2>{entry?"Configure employee":"Add employee"}</h2><button onClick={()=>setEntry(undefined)} aria-label="Close">×</button></div><form className="console-form" onSubmit={saveEmployee}><label>Employee name<input required maxLength={100} value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label><label>Professional role<input required maxLength={120} value={form.role} onChange={e=>setForm(v=>({...v,role:e.target.value}))}/></label><label>Department<input value={form.department} onChange={e=>setForm(v=>({...v,department:e.target.value}))}/></label><label>Status<select value={form.status} onChange={e=>setForm(v=>({...v,status:e.target.value as Employee["status"]}))}>{["Candidate","Active","Paused"].map(x=><option key={x}>{x}</option>)}</select></label><label>Instructions and responsibilities<textarea rows={4} value={form.instructions} onChange={e=>setForm(v=>({...v,instructions:e.target.value}))}/></label><div className="console-form-actions">{entry&&<button type="button" className="console-danger" disabled={busy} onClick={()=>void deleteEmployee()}>Delete employee</button>}<button type="button" className="console-outline" onClick={()=>setEntry(undefined)}>Cancel</button><button className="console-primary" disabled={busy}>Save to Supabase</button></div></form></div></div>}
  {task!==undefined&&<div className="console-overlay"><div className="console-dialog" role="dialog" aria-modal="true" aria-label="Assignment editor"><div className="console-dialog-head"><h2>{task?"Edit assignment":"Assign work"}</h2><button onClick={()=>setTask(undefined)} aria-label="Close">×</button></div><p className="console-context">{h.employees.find(x=>x.id===employeeId)?.name} · {assignedDate}</p><form className="console-form" onSubmit={saveTask}><label>Assignment<input required maxLength={140} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Instructions<textarea rows={4} value={details} onChange={e=>setDetails(e.target.value)}/></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value as Assignment["status"])}>{["Queued","In progress","Review","Complete"].map(x=><option key={x}>{x}</option>)}</select></label><div className="console-form-actions">{task&&<button type="button" className="console-danger" disabled={busy} onClick={()=>void deleteTask()}>Delete assignment</button>}<button type="button" className="console-outline" onClick={()=>setTask(undefined)}>Cancel</button><button className="console-primary" disabled={busy}>Save to Supabase</button></div></form></div></div>}
 </section>;
}
