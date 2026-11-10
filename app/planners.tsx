"use client";
import {useMemo,useState} from "react";

const DAY=86400000;
function dayStart(d:Date){return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function offset(d:Date,n:number){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function label(d:Date){return d.toLocaleDateString("en-CA",{month:"short",day:"numeric"});}
function monthLabel(a:Date,b:Date){return a.toLocaleDateString("en-CA",{month:"long",year:"numeric"})+(a.getMonth()!==b.getMonth()?" – "+b.toLocaleDateString("en-CA",{month:"long"}):"");}
const ventures=[
 {name:"GO™",short:"GO",tasks:[{name:"Product planning",start:1,length:7,type:0},{name:"Development",start:5,length:13,type:1},{name:"Testing & review",start:15,length:7,type:2}]},
 {name:"ULTIMATE FAN™",short:"UF",tasks:[{name:"Experience design",start:3,length:9,type:0},{name:"Merchandise setup",start:10,length:12,type:1},{name:"Launch preparation",start:21,length:6,type:2}]},
 {name:"EZWIPE™",short:"EZ",tasks:[{name:"Product specification",start:0,length:7,type:0},{name:"Supplier research",start:6,length:11,type:1},{name:"Prototype review",start:16,length:8,type:2}]},
 {name:"SPEEDY GUIDES™",short:"SG",tasks:[{name:"Editorial planning",start:2,length:9,type:0},{name:"Content production",start:9,length:13,type:1},{name:"Publishing review",start:19,length:7,type:2}]}
];
const employees=[
 {name:"AI Employee #001",role:"Web Application Developer",initials:"WD",notes:"Current candidate",tasks:[{day:0,title:"Development workspace",detail:"Role setup",type:0},{day:2,title:"Application development",detail:"Example assignment",type:1},{day:4,title:"Review & verification",detail:"Example assignment",type:2}]},
 {name:"Future Employee #002",role:"Graphic Designer",initials:"GD",notes:"Illustrative role",tasks:[{day:1,title:"Visual concepts",detail:"Example assignment",type:0},{day:3,title:"Asset production",detail:"Example assignment",type:1}]},
 {name:"Future Employee #003",role:"Marketing Manager",initials:"MM",notes:"Illustrative role",tasks:[{day:1,title:"Campaign planning",detail:"Example assignment",type:0},{day:4,title:"Campaign review",detail:"Example assignment",type:2}]}
];
const types=["Planning","Execution","Review"];
export function BusinessPlanner(){
 const [shift,setShift]=useState(0);
 const [selection,setSelection]=useState<string|null>(null);
 const today=dayStart(new Date());
 const start=offset(today,-today.getDay()+1+shift*28);
 const dates=Array.from({length:28},(_,i)=>offset(start,i));
 const taskInfo=selection?.split("|");
 return <section className="planner">
  <div className="planner-head"><div><div className="eyebrow">Portfolio Timeline</div><h1>My Businesses</h1><p>Track overlapping work across your business portfolio.</p></div>
   <div className="planner-controls"><button type="button" onClick={()=>setShift(s=>s-1)} aria-label="Previous four weeks">‹</button><button type="button" onClick={()=>setShift(0)}>Today</button><button type="button" onClick={()=>setShift(s=>s+1)} aria-label="Next four weeks">›</button></div>
  </div>
  <div className="planner-summary"><span><strong>{ventures.length}</strong> Businesses</span><span><strong>{ventures.reduce((n,v)=>n+v.tasks.length,0)}</strong> Example tasks</span><span className="planner-example">Illustrative timeline — not live assignments</span></div>
  <div className="planner-panel">
   <div className="planner-titlebar"><strong>Business timeline</strong><span>{monthLabel(dates[0],dates[27])}</span></div>
   <div className="gantt-scroll"><div className="gantt-inner">
    <div className="gantt-label gantt-corner">BUSINESS / TASK</div>
    <div className="gantt-days">{dates.map((d,i)=><div key={i} className={"gantt-day "+(d.getDay()===0||d.getDay()===6?"weekend ":"")+(d.toDateString()===today.toDateString()?"today":"")}><strong>{d.toLocaleDateString("en-CA",{weekday:"short"})}</strong><span>{d.getDate()}</span></div>)}</div>
    {ventures.map((v,vi)=><div className="gantt-group" key={v.name}>
     <div className="gantt-business"><span className="business-avatar">{v.short}</span><strong>{v.name}</strong><small>{v.tasks.length} example tasks</small></div>
     {v.tasks.map((t,ti)=><div className="gantt-task-row" key={t.name}>
      <div className="gantt-task-label">{t.name}</div>
      <div className="gantt-track">
       {dates.map((d,i)=><span key={i} className={"gantt-cell "+(d.getDay()===0||d.getDay()===6?"weekend ":"")+(d.toDateString()===today.toDateString()?"today":"")}/>)}
       {Math.max(0,Math.min(28,t.start+t.length-shift*28)-Math.max(0,t.start-shift*28))>0&&<button type="button" className={"gantt-bar tone-"+t.type} style={{left:(Math.max(0,t.start-shift*28)/28*100)+"%",width:((Math.min(28,t.start+t.length-shift*28)-Math.max(0,t.start-shift*28))/28*100)+"%"}} onClick={()=>setSelection(v.name+"|"+t.name)} title={v.name+" — "+t.name}>{t.name}</button>}
      </div>
     </div>)}
    </div>)}
   </div></div>
   <div className="planner-legend">{types.map((x,i)=><span key={x}><i className={"legend-dot tone-"+i}/>{x}</span>)}</div>
  </div>
  {taskInfo&&<div className="planner-selection" role="status"><strong>{taskInfo[0]}</strong><span>{taskInfo[1]} · Illustrative schedule</span><button type="button" onClick={()=>setSelection(null)} aria-label="Dismiss task details">×</button></div>}
  <p className="planner-caption">This is a visual prototype. The displayed time bars are examples; no scheduling database is connected yet.</p>
 </section>;
}
export function EmployeePlanner(){
 const [shift,setShift]=useState(0);
 const today=dayStart(new Date());
 const monday=offset(today,-((today.getDay()+6)%7)+shift*7);
 const dates=Array.from({length:7},(_,i)=>offset(monday,i));
 return <section className="planner">
  <div className="planner-head"><div><div className="eyebrow">Workforce Calendar</div><h1>My Employees</h1><p>See each employee's role and assignments side by side.</p></div>
   <div className="planner-controls"><button type="button" onClick={()=>setShift(s=>s-1)} aria-label="Previous week">‹</button><button type="button" onClick={()=>setShift(0)}>This week</button><button type="button" onClick={()=>setShift(s=>s+1)} aria-label="Next week">›</button></div>
  </div>
  <div className="planner-summary"><span><strong>1</strong> Current candidate</span><span><strong>2</strong> Future role examples</span><span className="planner-example">Sample assignments only</span></div>
  <div className="planner-panel">
   <div className="planner-titlebar"><strong>Employee schedule</strong><span>{label(dates[0])} – {label(dates[6])}</span></div>
   <div className="employee-scroll"><div className="employee-grid">
    <div className="employee-corner">WEEK OF<br/><strong>{label(dates[0])}</strong></div>
    {employees.map((e,i)=><div className="employee-column-head" key={e.name}><div className="employee-head-top"><span className={"employee-avatar tone-"+i}>{e.initials}</span><span><strong>{e.name}</strong><small>{e.notes}</small></span></div><div className="employee-role">{e.role}</div></div>)}
    {dates.map((date,di)=><div className="employee-day-group" key={di}>
      <div className={"employee-day-label "+(date.toDateString()===today.toDateString()?"current":"")}><strong>{date.toLocaleDateString("en-CA",{weekday:"short"})}</strong><span>{label(date)}</span></div>
      {employees.map((e,ei)=><div className={"employee-day-cell "+(date.toDateString()===today.toDateString()?"current":"")} key={e.name}>
       {shift===0?e.tasks.filter(t=>t.day===di).map((t,ti)=><div className={"employee-assignment tone-"+t.type} key={ti}><strong>{t.title}</strong><small>{t.detail}</small></div>):null}
       {shift===0&&!e.tasks.some(t=>t.day===di)&&<span className="employee-empty">No assignments</span>}
       {shift!==0&&<span className="employee-empty">No assignments</span>}
      </div>)}
    </div>)}
   </div></div>
  </div>
  <p className="planner-caption">Employee #001 represents the existing developer candidate. The other columns and all calendar assignments are illustrative placeholders, not hired staff or real work records.</p>
 </section>;
}
