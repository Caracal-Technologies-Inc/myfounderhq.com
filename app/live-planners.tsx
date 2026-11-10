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
type BusinessFile={id:string;user_id:string;business_id:string;name:string;storage_path:string;mime_type:string|null;size_bytes:number;created_at:string};
function BusinessWorkspace({business,db,userId,tasks,onChange,reportError}:{business:Business;db:ReturnType<typeof createBrowserClient>;userId:string;tasks:BusinessTask[];onChange:()=>Promise<void>;reportError:(message:string)=>void}){
 const [taskDialog,setTaskDialog]=useState<BusinessTask|null|undefined>(undefined);
 const [removingBusiness,setRemovingBusiness]=useState(false);
 const [taskTitle,setTaskTitle]=useState("");
 const [taskNotes,setTaskNotes]=useState("");
 const [taskStatus,setTaskStatus]=useState<BusinessTask["status"]>("Planned");
 const [taskBusy,setTaskBusy]=useState(false);
 const [fileTab,setFileTab]=useState<"all"|"upload">("all");
 const [files,setFiles]=useState<BusinessFile[]>([]);
 const [fileBusy,setFileBusy]=useState(false);
 const [fileError,setFileError]=useState("");
 const [fileLoading,setFileLoading]=useState(true);
 const [chosenFile,setChosenFile]=useState<File|null>(null);
 const [uploadReset,setUploadReset]=useState(0);
 const refreshFiles=useCallback(async()=>{
  setFileLoading(true);setFileError("");
  const {data,error}=await db.from("hq_business_files").select("*").eq("user_id",userId).eq("business_id",business.id).order("created_at",{ascending:false});
  if(error)setFileError(error.message);else setFiles((data||[]) as BusinessFile[]);
  setFileLoading(false);
 },[db,userId,business.id]);
 useEffect(()=>{void refreshFiles()},[refreshFiles]);
 const removeBusiness=async()=>{
  if(removingBusiness||fileBusy||taskBusy)return;
  if(!window.confirm("Permanently remove "+business.name+"? This will also delete its tasks, files, and business-specific employee assignments and records. This cannot be undone."))return;
  setRemovingBusiness(true);
  try{
   // Remove actual private Storage objects before cascading their metadata in Postgres.
   // Collect every page rather than relying on the default 1,000-record REST cap.
   const paths:string[]=[];
   for(let offset=0;;offset+=500){
    const {data,error}=await db.from("hq_business_files").select("storage_path").eq("user_id",userId).eq("business_id",business.id).order("id").range(offset,offset+499);
    if(error)throw Error(error.message);
    const page=data||[];
    paths.push(...page.map((row:{storage_path:string})=>row.storage_path));
    if(page.length<500)break;
   }
   for(let i=0;i<paths.length;i+=100){
    const {error}=await db.storage.from("hq-business-files").remove(paths.slice(i,i+100));
    if(error)throw Error("Could not remove attached files: "+error.message);
   }
   // Database foreign keys cascade tasks, file metadata, business instances and their histories.
   const {data,error}=await db.from("hq_businesses").delete().eq("id",business.id).eq("user_id",userId).select("id");
   if(error)throw Error(error.message);
   if(!data?.length)throw Error("Business could not be removed. Please refresh and retry.");
   await onChange();
  }catch(err){reportError(err instanceof Error?err.message:String(err));}
  finally{setRemovingBusiness(false);}
 };
 const editTask=(task:BusinessTask|null)=>{
  setTaskDialog(task);setTaskTitle(task?.title||"");setTaskNotes(task?.notes||"");setTaskStatus(task?.status||"Planned");
 };
 const saveTask=async(e:React.FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!taskTitle.trim())return;setTaskBusy(true);
  const fields={business_id:business.id,title:taskTitle.trim(),notes:taskNotes.trim(),status:taskStatus};
  const {error}=taskDialog?await db.from("hq_business_tasks").update(fields).eq("id",taskDialog.id).eq("user_id",userId):await db.from("hq_business_tasks").insert({...fields,user_id:userId});
  if(error)reportError(error.message);else{setTaskDialog(undefined);await onChange();}
  setTaskBusy(false);
 };
 const deleteTask=async()=>{
  if(!taskDialog||!window.confirm("Delete this task?"))return;
  setTaskBusy(true);const {error}=await db.from("hq_business_tasks").delete().eq("id",taskDialog.id).eq("user_id",userId);
  if(error)reportError(error.message);else{setTaskDialog(undefined);await onChange();}
  setTaskBusy(false);
 };
 const upload=async(e:React.FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!chosenFile)return;
  setFileBusy(true);setFileError("");
  const safe=chosenFile.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-130)||"file";
  const path=userId+"/"+business.id+"/"+crypto.randomUUID()+"-"+safe;
  const {error:uploadError}=await db.storage.from("hq-business-files").upload(path,chosenFile,{contentType:chosenFile.type||"application/octet-stream",upsert:false});
  if(uploadError){setFileError(uploadError.message);setFileBusy(false);return;}
  const {error:recordError}=await db.from("hq_business_files").insert({user_id:userId,business_id:business.id,name:chosenFile.name,storage_path:path,mime_type:chosenFile.type||null,size_bytes:chosenFile.size});
  if(recordError){await db.storage.from("hq-business-files").remove([path]);setFileError(recordError.message);}
  else{setChosenFile(null);setUploadReset(n=>n+1);setFileTab("all");await refreshFiles();}
  setFileBusy(false);
 };
 const openFile=async(file:BusinessFile)=>{
  setFileError("");
  const {data,error}=await db.storage.from("hq-business-files").createSignedUrl(file.storage_path,60);
  if(error||!data?.signedUrl){setFileError(error?.message||"Unable to open file.");return;}
  window.open(data.signedUrl,"_blank","noopener,noreferrer");
 };
 const removeFile=async(file:BusinessFile)=>{
  if(!window.confirm("Delete "+file.name+" permanently?"))return;setFileBusy(true);setFileError("");
  const {error:storageError}=await db.storage.from("hq-business-files").remove([file.storage_path]);
  if(storageError){setFileError(storageError.message);setFileBusy(false);return;}
  const {error}=await db.from("hq_business_files").delete().eq("id",file.id).eq("user_id",userId);
  if(error)setFileError(error.message);else await refreshFiles();
  setFileBusy(false);
 };
 return <article className="hq-business-item">
  <div className="hq-business-name"><h2>{business.name}</h2><button className="hq-remove-business" type="button" disabled={removingBusiness||fileBusy||taskBusy} onClick={()=>void removeBusiness()}>{removingBusiness?"Removing…":"Remove business"}</button></div>
  <section className="hq-business-tasks" aria-label={"Tasks for "+business.name}>
   <div className="hq-business-panel-head"><h3>Business tasks</h3><button type="button" onClick={()=>editTask(null)}>+ Add task</button></div>
   {tasks.length===0?<p className="hq-business-muted">No tasks yet</p>:<div className="hq-task-list">{tasks.map(t=><div className="hq-task-line" key={t.id}><div><strong>{t.title}</strong><small>{t.status}</small></div><button type="button" onClick={()=>editTask(t)}>Edit</button><button type="button" className="hq-task-remove" onClick={()=>{if(window.confirm("Delete "+t.title+"?")){void (async()=>{const {error}=await db.from("hq_business_tasks").delete().eq("id",t.id).eq("user_id",userId);if(error)reportError(error.message);else await onChange();})();}}}>Remove</button></div>)}</div>}
  </section>
  <section className="hq-business-files" aria-label={"Files for "+business.name}>
   <div className="hq-business-panel-head"><h3>Business files</h3></div>
   <div className="hq-file-tabs" role="tablist" aria-label="Business files"><button type="button" role="tab" aria-selected={fileTab==="all"} className={fileTab==="all"?"active":""} onClick={()=>setFileTab("all")}>Files</button><button type="button" role="tab" aria-selected={fileTab==="upload"} className={fileTab==="upload"?"active":""} onClick={()=>setFileTab("upload")}>Upload</button></div>
   {fileError&&<p role="alert" className="hq-file-error">{fileError}</p>}
   {fileTab==="all"?<div className="hq-file-list">{fileLoading?<p className="hq-business-muted">Loading files…</p>:files.length===0?<p className="hq-business-muted">No files yet</p>:files.map(f=><div className="hq-file-line" key={f.id}><span title={f.name}>{f.name}</span><button type="button" onClick={()=>void openFile(f)}>Open</button><button type="button" disabled={fileBusy} onClick={()=>void removeFile(f)}>Remove</button></div>)}</div>:<form className="hq-upload-form" onSubmit={upload}><input key={uploadReset} required type="file" onChange={e=>setChosenFile(e.target.files?.[0]||null)}/><button type="submit" disabled={!chosenFile||fileBusy}>{fileBusy?"Uploading…":"Upload file"}</button></form>}
  </section>
  {taskDialog!==undefined&&<div className="console-overlay"><div className="console-dialog" role="dialog" aria-modal="true" aria-label="Business task"><div className="console-dialog-head"><h2>{taskDialog?"Edit task":"Add task"}</h2><button type="button" onClick={()=>setTaskDialog(undefined)} aria-label="Close">×</button></div><form className="console-form" onSubmit={saveTask}><label>Task name<input required maxLength={140} value={taskTitle} onChange={e=>setTaskTitle(e.target.value)}/></label><label>Status<select value={taskStatus} onChange={e=>setTaskStatus(e.target.value as BusinessTask["status"])}>{["Planned","In progress","Review","Done"].map(s=><option key={s}>{s}</option>)}</select></label><label>Notes<textarea rows={3} value={taskNotes} onChange={e=>setTaskNotes(e.target.value)}/></label><div className="console-form-actions">{taskDialog&&<button type="button" className="console-danger" disabled={taskBusy} onClick={()=>void deleteTask()}>Remove</button>}<button type="button" className="console-outline" onClick={()=>setTaskDialog(undefined)}>Cancel</button><button type="submit" className="console-primary" disabled={taskBusy}>{taskBusy?"Saving…":"Save task"}</button></div></form></div></div>}
 </article>;
}
export function BusinessPlanner({userId}:{userId:string}){
 const h=useHQ(userId);
 const [open,setOpen]=useState(false);
 const [name,setName]=useState("");
 const [busy,setBusy]=useState(false);
 const saveBusiness=async(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();const businessName=name.trim();if(!businessName)return;
  setBusy(true);
  const {error}=await h.db.from("hq_businesses").insert({user_id:userId,name:businessName,status:"Planning"});
  if(error)h.setError(error.message);else{setOpen(false);setName("");await h.refresh();}
  setBusy(false);
 };
 return <section className="planner business-console hq-live">
  <div className="console-top"><div><div className="eyebrow">BUSINESS CONTROL CENTER</div><h1>My Businesses</h1></div><button className="console-primary" type="button" onClick={()=>setOpen(true)}>+ Add business</button></div>
  {h.error&&<div className="hq-error" role="alert">{h.error}<button onClick={()=>void h.refresh()}>Retry</button></div>}
  {h.loading&&<p className="hq-business-muted" role="status">Loading businesses…</p>}
  {!h.loading&&!h.businesses.length&&<p className="hq-business-muted">No businesses yet</p>}
  <div className="hq-business-list">{h.businesses.map(b=><BusinessWorkspace key={b.id} business={b} userId={userId} db={h.db} tasks={h.businessTasks.filter(t=>t.business_id===b.id)} onChange={h.refresh} reportError={h.setError}/>)}</div>
  {open&&<div className="console-overlay"><div className="console-dialog" role="dialog" aria-modal="true" aria-label="Add business"><div className="console-dialog-head"><h2>Add business</h2><button type="button" onClick={()=>setOpen(false)} aria-label="Close">×</button></div><form className="console-form" onSubmit={saveBusiness}><label>Business name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><div className="console-form-actions"><button type="button" className="console-outline" onClick={()=>setOpen(false)}>Cancel</button><button type="submit" className="console-primary" disabled={busy}>{busy?"Adding…":"Add business"}</button></div></form></div></div>}
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
