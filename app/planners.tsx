"use client";
import React,{useEffect,useState} from "react";

const DAY=86400000;
function dayStart(d:Date){return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function offset(d:Date,n:number){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function label(d:Date){return d.toLocaleDateString("en-CA",{month:"short",day:"numeric"});}
function monthLabel(a:Date,b:Date){return a.toLocaleDateString("en-CA",{month:"long",year:"numeric"})+(a.getMonth()!==b.getMonth()?" – "+b.toLocaleDateString("en-CA",{month:"long"}):"");}
type Business={id:string;name:string;description:string;status:"Planning"|"Active"|"Paused"|"Launched"};
type BusinessTask={id:string;businessId:string;title:string;start:string;end:string;status:"Planned"|"In progress"|"Review"|"Done";notes:string};
const BUSINESS_KEY="myfounderhq.business-console.v1";
const initialBusinesses:Business[]=[
 {id:"go",name:"GO™",description:"Voice navigation and planning",status:"Planning"},
 {id:"ultimate-fan",name:"ULTIMATE FAN™",description:"Fan experiences and merchandise",status:"Planning"},
 {id:"ezwipe",name:"EZWIPE™",description:"Physical product development",status:"Planning"},
 {id:"speedy-guides",name:"SPEEDY GUIDES™",description:"Publishing and media",status:"Planning"}
];
const emptyBusiness={name:"",description:"",status:"Planning" as Business["status"]};
function dayNumber(value:string){return Math.floor(Date.parse(value+"T12:00:00Z")/86400000);}
export function BusinessPlanner({accountKey=""}:{accountKey?:string}){
 const [view,setView]=useState<"timeline"|"setup">("timeline");
 const [businesses,setBusinesses]=useState<Business[]>(initialBusinesses);
 const [tasks,setTasks]=useState<BusinessTask[]>([]);
 const [loaded,setLoaded]=useState(false);
 const [shift,setShift]=useState(0);
 const [businessDialog,setBusinessDialog]=useState(false);
 const [businessEditing,setBusinessEditing]=useState<string|null>(null);
 const [businessForm,setBusinessForm]=useState(emptyBusiness);
 const [taskDialog,setTaskDialog]=useState(false);
 const [taskEditing,setTaskEditing]=useState<string|null>(null);
 const [taskBusiness,setTaskBusiness]=useState("");
 const [taskTitle,setTaskTitle]=useState("");
 const [taskStart,setTaskStart]=useState("");
 const [taskEnd,setTaskEnd]=useState("");
 const [taskStatus,setTaskStatus]=useState<BusinessTask["status"]>("Planned");
 const [taskNotes,setTaskNotes]=useState("");
 const [error,setError]=useState("");
 const storageKey=BUSINESS_KEY+":"+accountKey;
 useEffect(()=>{
  try{const raw=window.localStorage.getItem(storageKey);if(raw){
   const parsed=JSON.parse(raw);
   setBusinesses(Array.isArray(parsed.businesses)?parsed.businesses.filter((x:Business)=>x&&typeof x.id==="string"&&typeof x.name==="string"):initialBusinesses);
   setTasks(Array.isArray(parsed.tasks)?parsed.tasks.filter((x:BusinessTask)=>x&&typeof x.id==="string"&&typeof x.businessId==="string"):[]);
  }else{setBusinesses(initialBusinesses);setTasks([]);}
  }catch{setBusinesses(initialBusinesses);setTasks([]);}
  setLoaded(true);
 },[storageKey]);
 useEffect(()=>{if(loaded){try{window.localStorage.setItem(storageKey,JSON.stringify({businesses,tasks}));}catch{/* Browser storage unavailable */}}},[storageKey,loaded,businesses,tasks]);
 const today=dayStart(new Date());
 const monday=offset(today,-((today.getDay()+6)%7)+shift*28);
 const dates=Array.from({length:28},(_,i)=>offset(monday,i));
 const firstDay=dayNumber(toLocalISO(dates[0]));
 const lastDay=firstDay+27;
 const openBusiness=(entry?:Business)=>{setBusinessEditing(entry?.id||null);setBusinessForm(entry?{name:entry.name,description:entry.description,status:entry.status}:emptyBusiness);setBusinessDialog(true);};
 const saveBusiness=(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();const name=businessForm.name.trim();if(!name)return;const record={...businessForm,name,description:businessForm.description.trim()};if(businessEditing){setBusinesses(v=>v.map(x=>x.id===businessEditing?{...x,...record}:x));}else{setBusinesses(v=>[...v,{...record,id:newId()}]);}setBusinessDialog(false);};
 const openTask=(businessId:string,entry?:BusinessTask)=>{setError("");setTaskEditing(entry?.id||null);setTaskBusiness(businessId);setTaskTitle(entry?.title||"");setTaskStart(entry?.start||toLocalISO(today));setTaskEnd(entry?.end||toLocalISO(offset(today,3)));setTaskStatus(entry?.status||"Planned");setTaskNotes(entry?.notes||"");setTaskDialog(true);};
 const saveTask=(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!taskTitle.trim()||!taskBusiness)return;if(dayNumber(taskEnd)<dayNumber(taskStart)){setError("End date must be on or after the start date.");return;}const record={businessId:taskBusiness,title:taskTitle.trim(),start:taskStart,end:taskEnd,status:taskStatus,notes:taskNotes.trim()};if(taskEditing){setTasks(v=>v.map(t=>t.id===taskEditing?{...t,...record}:t));}else{setTasks(v=>[...v,{id:newId(),...record}]);}setTaskDialog(false);};
 const activeBusiness=businesses.find(x=>x.id===taskBusiness);
 return <section className="planner business-console">
  <div className="console-top"><div><div className="eyebrow">BUSINESS CONTROL CENTER</div><h1>My Businesses</h1></div><button className="console-primary" type="button" onClick={()=>{openBusiness();setView("setup");}}>+ Add business</button></div>
  <div className="console-toolbar" role="toolbar" aria-label="Business workspace controls">
   <div className="console-switch"><button type="button" aria-pressed={view==="timeline"} className={view==="timeline"?"selected":""} onClick={()=>setView("timeline")}>▤ Timeline view</button><button type="button" aria-pressed={view==="setup"} className={view==="setup"?"selected":""} onClick={()=>setView("setup")}>⚙ Business setup</button></div>
   <span className="console-count">{businesses.length} businesses · {tasks.length} scheduled tasks</span>
   {view==="timeline"&&<div className="planner-controls"><button type="button" onClick={()=>setShift(s=>s-1)} aria-label="Previous four weeks">‹</button><button type="button" onClick={()=>setShift(0)}>Today</button><button type="button" onClick={()=>setShift(s=>s+1)} aria-label="Next four weeks">›</button></div>}
  </div>
  {view==="timeline"?<>
   <div className="console-hint"><strong>PORTFOLIO COMMAND GRID</strong><span>{monthLabel(dates[0],dates[27])} · Scroll horizontally across dates · Select + to schedule work</span></div>
   <div className="business-scroll" tabIndex={0} aria-label="Scrollable portfolio Gantt schedule">
    <div className="business-grid">
     <div className="business-sticky-corner">BUSINESS / TASK</div>
     <div className="business-dates">{dates.map((d,i)=><div className={"business-day "+(toLocalISO(d)===toLocalISO(today)?"is-today":"")} key={i}><span>{d.toLocaleDateString("en-CA",{weekday:"short"})}</span><strong>{d.getDate()}</strong></div>)}</div>
     {businesses.map(b=><React.Fragment key={b.id}>
      <div className="business-group-heading"><div className="business-heading-name"><span className="business-small-avatar">{b.name.slice(0,2).toUpperCase()}</span><strong>{b.name}</strong><span className="business-state">{b.status}</span></div><div className="business-heading-actions"><button type="button" onClick={()=>openTask(b.id)}>+ Task</button><button type="button" onClick={()=>{openBusiness(b);setView("setup");}} aria-label={"Configure "+b.name}>⚙</button></div></div>
      <div className="business-group-track"><span>{tasks.filter(t=>t.businessId===b.id).length} assignments</span></div>
      {(tasks.filter(t=>t.businessId===b.id).length?tasks.filter(t=>t.businessId===b.id).sort((a,b)=>a.start.localeCompare(b.start)):[]).map(t=>{
       const left=Math.max(0,dayNumber(t.start)-firstDay);
       const right=Math.min(28,dayNumber(t.end)-firstDay+1);
       const visible=right>left;
       return <React.Fragment key={t.id}><div className="business-task-name" title={t.title}>{t.title}</div><div className="business-task-track">{visible&&<button className={"business-task-bar state-"+t.status.toLowerCase().replaceAll(" ","-")} type="button" style={{left:(left*42)+"px",width:((right-left)*42-4)+"px"}} title={t.title+" · "+t.start+" to "+t.end} onClick={()=>openTask(b.id,t)}>{t.title}<span>{t.status}</span></button>}</div></React.Fragment>;
      })}
      {tasks.every(t=>t.businessId!==b.id)&&<><div className="business-task-name is-empty">No scheduled tasks</div><div className="business-task-track business-empty-track"><button type="button" onClick={()=>openTask(b.id)}>+ Schedule first task</button></div></>}
     </React.Fragment>)}
    </div>
   </div>
   {!businesses.length&&<div className="console-empty">No businesses yet. Use <strong>+ Add business</strong> to create one.</div>}
  </>:<div className="console-setup"><div className="console-setup-head"><div><h2>Business registry</h2><p>Manage businesses and schedule their work from this control room.</p></div><button className="console-outline" onClick={()=>openBusiness()} type="button">+ New business</button></div><div className="console-directory">{businesses.map(b=><div className="console-profile" key={b.id}><span className="console-avatar">{b.name.slice(0,2).toUpperCase()}</span><div className="console-profile-info"><strong>{b.name}</strong><span>{b.description||"No description"}</span><small>{b.status} · {tasks.filter(t=>t.businessId===b.id).length} tasks</small></div><button type="button" className="console-outline" onClick={()=>openTask(b.id)}>+ Task</button><button className="console-outline" type="button" onClick={()=>openBusiness(b)}>Configure</button></div>)}{!businesses.length&&<p>No businesses configured.</p>}</div></div>}
  {businessDialog&&<div className="console-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setBusinessDialog(false);}}><div className="console-dialog" role="dialog" aria-modal="true" aria-label={businessEditing?"Configure business":"Add business"}><div className="console-dialog-head"><h2>{businessEditing?"Configure business":"Add business"}</h2><button type="button" onClick={()=>setBusinessDialog(false)} aria-label="Close">×</button></div><form className="console-form" onSubmit={saveBusiness}><label>Business name<input required maxLength={100} value={businessForm.name} onChange={e=>setBusinessForm(v=>({...v,name:e.target.value}))} placeholder="e.g. GO™"/></label><label>Description<input maxLength={180} value={businessForm.description} onChange={e=>setBusinessForm(v=>({...v,description:e.target.value}))} placeholder="What does this business do?"/></label><label>Business status<select value={businessForm.status} onChange={e=>setBusinessForm(v=>({...v,status:e.target.value as Business["status"]}))}><option>Planning</option><option>Active</option><option>Paused</option><option>Launched</option></select></label><div className="console-form-actions">{businessEditing&&<button className="console-danger" type="button" onClick={()=>{if(window.confirm("Remove this business and all of its tasks?")){setBusinesses(v=>v.filter(x=>x.id!==businessEditing));setTasks(v=>v.filter(t=>t.businessId!==businessEditing));setBusinessDialog(false);}}}>Remove business</button>}<button className="console-outline" type="button" onClick={()=>setBusinessDialog(false)}>Cancel</button><button className="console-primary" type="submit">Save business</button></div></form></div></div>}
  {taskDialog&&<div className="console-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setTaskDialog(false);}}><div className="console-dialog" role="dialog" aria-modal="true" aria-label={taskEditing?"Configure task":"Schedule task"}><div className="console-dialog-head"><h2>{taskEditing?"Configure task":"Schedule work"}</h2><button type="button" onClick={()=>setTaskDialog(false)} aria-label="Close">×</button></div><p className="console-context">{activeBusiness?.name||"Business"}</p><form className="console-form" onSubmit={saveTask}><label>Assignment<input required maxLength={140} value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} placeholder="Work to be completed"/></label><div className="business-dates-form"><label>Start<input required type="date" value={taskStart} onChange={e=>setTaskStart(e.target.value)}/></label><label>End<input required type="date" value={taskEnd} onChange={e=>setTaskEnd(e.target.value)}/></label></div><label>Status<select value={taskStatus} onChange={e=>setTaskStatus(e.target.value as BusinessTask["status"])}><option>Planned</option><option>In progress</option><option>Review</option><option>Done</option></select></label><label>Instructions / notes<textarea rows={4} value={taskNotes} onChange={e=>setTaskNotes(e.target.value)} placeholder="Intended outcome and relevant details"/></label>{error&&<p role="alert" className="console-error">{error}</p>}<div className="console-form-actions">{taskEditing&&<button className="console-danger" type="button" onClick={()=>{if(window.confirm("Delete this task?")){setTasks(v=>v.filter(t=>t.id!==taskEditing));setTaskDialog(false);}}}>Delete task</button>}<button className="console-outline" type="button" onClick={()=>setTaskDialog(false)}>Cancel</button><button className="console-primary" type="submit">Save task</button></div></form></div></div>}
  <p className="planner-caption">Local business control prototype: edits are saved in this browser only. No database synchronization or AI task execution yet.</p>
 </section>;
}
function toLocalISO(d:Date){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
type Employee={id:string;name:string;role:string;department:string;status:"Candidate"|"Active"|"Paused";instructions:string};
type Assignment={id:string;employeeId:string;date:string;title:string;details:string;status:"Queued"|"In progress"|"Review"|"Complete"};
const KEY="myfounderhq.employee-console.v1";
const seed:Employee[]=[{id:"employee-001",name:"AI Employee #001",role:"Web Application Developer",department:"Engineering",status:"Candidate",instructions:""}];
function isoDate(d:Date){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return y+"-"+m+"-"+day;}
function newId(){return typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():String(Date.now())+"-"+Math.random().toString(36).slice(2);}
const emptyEmployee={name:"",role:"",department:"",status:"Candidate" as Employee["status"],instructions:""};
export function EmployeePlanner({accountKey=""}:{accountKey?:string}){
 const [view,setView]=useState<"calendar"|"setup">("calendar");
 const [employees,setEmployees]=useState<Employee[]>(seed);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [loaded,setLoaded]=useState(false);
 const [shift,setShift]=useState(0);
 const [adding,setAdding]=useState(false);
 const [editing,setEditing]=useState<string|null>(null);
 const [form,setForm]=useState(emptyEmployee);
 const [taskTarget,setTaskTarget]=useState<{employeeId:string;date:string}|null>(null);
 const [taskTitle,setTaskTitle]=useState("");
 const [taskDetails,setTaskDetails]=useState("");
 const [taskStatus,setTaskStatus]=useState<Assignment["status"]>("Queued");
 const [activeTask,setActiveTask]=useState<string|null>(null);
 const storageKey=KEY+":"+accountKey;
 useEffect(()=>{
  try{
   const raw=window.localStorage.getItem(storageKey);
   if(raw){const parsed=JSON.parse(raw);
    if(Array.isArray(parsed.employees))setEmployees(parsed.employees.filter((x:Employee)=>x&&typeof x.id==="string"&&typeof x.name==="string"));
    if(Array.isArray(parsed.assignments))setAssignments(parsed.assignments.filter((x:Assignment)=>x&&typeof x.id==="string"&&typeof x.employeeId==="string"));
   }else{setEmployees(seed);setAssignments([]);}
  }catch{setEmployees(seed);setAssignments([]);}
  setLoaded(true);
 },[storageKey]);
 useEffect(()=>{if(loaded){try{window.localStorage.setItem(storageKey,JSON.stringify({employees,assignments}));}catch{/* Unavailable browser storage */}}},[employees,assignments,loaded,storageKey]);
 const today=dayStart(new Date());
 const monday=offset(today,-((today.getDay()+6)%7)+shift*7);
 const dates=Array.from({length:7},(_,i)=>offset(monday,i));
 const task=assignments.find(t=>t.id===activeTask);
 const openCreate=()=>{setForm(emptyEmployee);setEditing(null);setAdding(true);setView("setup");};
 const saveEmployee=(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();const name=form.name.trim(),role=form.role.trim();if(!name||!role)return;
  if(editing){setEmployees(current=>current.map(x=>x.id===editing?{...x,...form,name,role}:x));}
  else setEmployees(current=>[...current,{...form,id:newId(),name,role}]);
  setAdding(false);setEditing(null);setForm(emptyEmployee);
 };
 const editEmployee=(x:Employee)=>{setForm({name:x.name,role:x.role,department:x.department,status:x.status,instructions:x.instructions});setEditing(x.id);setAdding(true);};
 const removeEmployee=(x:Employee)=>{if(window.confirm("Remove "+x.name+" and their scheduled assignments?")){setEmployees(v=>v.filter(e=>e.id!==x.id));setAssignments(v=>v.filter(t=>t.employeeId!==x.id));if(editing===x.id)setAdding(false);}};
 const openTask=(employeeId:string,date:string)=>{setTaskTarget({employeeId,date});setTaskTitle("");setTaskDetails("");setTaskStatus("Queued");setActiveTask(null);};
 const saveTask=(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!taskTarget||!taskTitle.trim())return;setAssignments(v=>[...v,{id:newId(),...taskTarget,title:taskTitle.trim(),details:taskDetails.trim(),status:taskStatus}]);setTaskTarget(null);};
 return <section className="planner employee-console">
  <div className="console-top"><div><div className="eyebrow">WORKFORCE CONTROL CENTER</div><h1>My Employees</h1></div><button className="console-primary" type="button" onClick={openCreate}>+ Add employee</button></div>
  <div className="console-toolbar" role="toolbar" aria-label="Employee workspace controls">
   <div className="console-switch"><button type="button" className={view==="calendar"?"selected":""} aria-pressed={view==="calendar"} onClick={()=>setView("calendar")}>▦ Calendar view</button><button type="button" className={view==="setup"?"selected":""} aria-pressed={view==="setup"} onClick={()=>setView("setup")}>⚙ Employee setup</button></div>
   <span className="console-count">{employees.length} employees / candidates · {assignments.length} assignments</span>
   {view==="calendar"&&<div className="planner-controls"><button onClick={()=>setShift(x=>x-1)} aria-label="Previous week" type="button">‹</button><button onClick={()=>setShift(0)} type="button">This week</button><button onClick={()=>setShift(x=>x+1)} aria-label="Next week" type="button">›</button></div>}
  </div>
  {view==="calendar"?<>
   <div className="console-hint"><strong>COMMAND GRID</strong><span>{label(dates[0])} – {label(dates[6])} · Scroll sideways through employees · Select + to assign work</span></div>
   <div className="console-scroll" tabIndex={0} aria-label="Scrollable employee calendar">
    <div className="console-grid" style={{gridTemplateColumns:"96px repeat("+employees.length+", minmax(265px, 300px))",minWidth:96+employees.length*265}}>
     <div className="console-corner">DATE / TEAM</div>
     {employees.map(x=><div className="console-employee-header" key={x.id}><div className="console-employee-headrow"><span className="console-avatar">{x.role.split(" ").map(y=>y[0]).slice(0,2).join("").toUpperCase()}</span><div className="console-employee-identity"><strong>{x.name}</strong><span>{x.role}</span></div><button type="button" title="Edit employee" aria-label={"Edit "+x.name} onClick={()=>{editEmployee(x);setView("setup");}}>⚙</button></div><div className="console-employee-meta"><span>{x.status}</span><span>{x.department||"Unassigned department"}</span></div></div>)}
     {dates.map(date=><React.Fragment key={isoDate(date)}>
      <div className={"console-date "+(isoDate(date)===isoDate(today)?"is-today":"")}><strong>{date.toLocaleDateString("en-CA",{weekday:"short"})}</strong><span>{label(date)}</span></div>
      {employees.map(emp=><div className={"console-cell "+(isoDate(date)===isoDate(today)?"is-today":"")} key={emp.id+"-"+isoDate(date)}>
       {assignments.filter(t=>t.employeeId===emp.id&&t.date===isoDate(date)).map(t=><button className="console-task" key={t.id} type="button" onClick={()=>{setActiveTask(t.id);setTaskTarget(null);}}><strong>{t.title}</strong><small>{t.status}</small></button>)}
       <button className="console-cell-add" type="button" onClick={()=>openTask(emp.id,isoDate(date))} aria-label={"Assign work to "+emp.name+" on "+label(date)}>+ Assign task</button>
      </div>)}
     </React.Fragment>)}
    </div>
   </div>
   {employees.length===0&&<div className="console-empty">No employees yet. Use <strong>+ Add employee</strong> to create your first column.</div>}
  </>:<>
   <div className="console-setup">
    <div className="console-setup-head"><div><h2>Employee registry</h2><p>Configure your workforce. Select an employee to edit their professional profile.</p></div><button type="button" className="console-outline" onClick={openCreate}>+ New employee</button></div>
    <div className="console-directory">{employees.map(emp=><div className="console-profile" key={emp.id}><div className="console-avatar">{emp.role.split(" ").map(y=>y[0]).slice(0,2).join("").toUpperCase()}</div><div className="console-profile-info"><strong>{emp.name}</strong><span>{emp.role}</span><small>{emp.department||"No department"} · {emp.status}</small></div><button type="button" className="console-outline" onClick={()=>editEmployee(emp)}>Configure</button></div>)}{employees.length===0&&<p>No employees configured. Add one to begin.</p>}</div>
   </div>
  </>}
  {adding&&<div className="console-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setAdding(false);}}><div className="console-dialog" role="dialog" aria-modal="true" aria-label={editing?"Edit employee":"Add employee"}><div className="console-dialog-head"><h2>{editing?"Configure employee":"Add employee"}</h2><button type="button" onClick={()=>setAdding(false)} aria-label="Close">×</button></div><form onSubmit={saveEmployee} className="console-form">
    <label>Employee name<input required maxLength={80} value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} placeholder="e.g. AI Web Developer #002"/></label>
    <label>Professional role<input required maxLength={100} value={form.role} onChange={e=>setForm(v=>({...v,role:e.target.value}))} placeholder="e.g. Graphic Designer"/></label>
    <label>Department<input maxLength={100} value={form.department} onChange={e=>setForm(v=>({...v,department:e.target.value}))} placeholder="Engineering, Design, Operations…"/></label>
    <label>Employee status<select value={form.status} onChange={e=>setForm(v=>({...v,status:e.target.value as Employee["status"]}))}><option>Candidate</option><option>Active</option><option>Paused</option></select></label>
    <label>Role instructions / responsibilities<textarea rows={4} value={form.instructions} onChange={e=>setForm(v=>({...v,instructions:e.target.value}))} placeholder="Define what this employee is responsible for…"/></label>
    <div className="console-form-actions">{editing&&<button type="button" className="console-danger" onClick={()=>{const emp=employees.find(x=>x.id===editing);if(emp)removeEmployee(emp);}}>Remove employee</button>}<button type="button" className="console-outline" onClick={()=>setAdding(false)}>Cancel</button><button type="submit" className="console-primary">Save employee</button></div>
   </form></div></div>}
  {taskTarget&&<div className="console-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setTaskTarget(null);}}><div className="console-dialog" role="dialog" aria-modal="true" aria-label="Assign task"><div className="console-dialog-head"><h2>Assign work</h2><button type="button" onClick={()=>setTaskTarget(null)} aria-label="Close">×</button></div><p className="console-context">{employees.find(x=>x.id===taskTarget.employeeId)?.name} · {taskTarget.date}</p><form className="console-form" onSubmit={saveTask}><label>Assignment<input required maxLength={140} value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} placeholder="What needs to be done?"/></label><label>Instructions<textarea rows={4} value={taskDetails} onChange={e=>setTaskDetails(e.target.value)} placeholder="Outcome, scope, acceptance criteria…"/></label><label>Status<select value={taskStatus} onChange={e=>setTaskStatus(e.target.value as Assignment["status"])}><option>Queued</option><option>In progress</option><option>Review</option><option>Complete</option></select></label><div className="console-form-actions"><button type="button" className="console-outline" onClick={()=>setTaskTarget(null)}>Cancel</button><button type="submit" className="console-primary">Save assignment</button></div></form></div></div>}
  {task&&<div className="console-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setActiveTask(null);}}><div className="console-dialog" role="dialog" aria-modal="true" aria-label="Task details"><div className="console-dialog-head"><h2>{task.title}</h2><button type="button" onClick={()=>setActiveTask(null)} aria-label="Close">×</button></div><p className="console-context">{employees.find(x=>x.id===task.employeeId)?.name} · {task.date}</p><p>{task.details||"No additional instructions."}</p><label className="console-status-label">Status<select value={task.status} onChange={e=>setAssignments(v=>v.map(x=>x.id===task.id?{...x,status:e.target.value as Assignment["status"]}:x))}><option>Queued</option><option>In progress</option><option>Review</option><option>Complete</option></select></label><div className="console-form-actions"><button className="console-danger" type="button" onClick={()=>{if(window.confirm("Delete this assignment?")){setAssignments(v=>v.filter(x=>x.id!==task.id));setActiveTask(null);}}}>Delete task</button><button type="button" className="console-primary" onClick={()=>setActiveTask(null)}>Done</button></div></div></div>}
  <p className="planner-caption">Local workspace prototype: employee profiles and assignments are saved in this browser only. No AI agents are executed and no Supabase records are written yet.</p>
 </section>;
}
