"use client";
import {useEffect,useMemo,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";

type Theme="light"|"dark";
export default function ThemeToggle({userId}:{userId?:string}){
 const [theme,setTheme]=useState<Theme>("light");
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const db=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),[]);
 useEffect(()=>{
  let valid=true;
  if(!userId){document.documentElement.dataset.theme="light";return;}
  void (async()=>{
   const {data,error}=await db.from("hq_user_preferences").select("theme").eq("user_id",userId).maybeSingle();
   if(valid&&!error){const chosen:Theme=data?.theme==="dark"?"dark":"light";setTheme(chosen);document.documentElement.dataset.theme=chosen;}
   if(valid&&error)setError("Could not load appearance setting.");
  })();
  return ()=>{valid=false;};
 },[db,userId]);
 async function change(next:Theme){
  const prior=theme;
  setTheme(next);document.documentElement.dataset.theme=next;setError("");
  if(!userId)return;
  setSaving(true);
  const {error}=await db.from("hq_user_preferences").upsert({user_id:userId,theme:next},{onConflict:"user_id"});
  setSaving(false);
  if(error){setTheme(prior);document.documentElement.dataset.theme=prior;setError("Theme not saved: "+error.message);}
 }
 return <div><div className="theme-control" role="group" aria-label="Appearance">
  <button type="button" disabled={saving} onClick={()=>void change("light")} aria-pressed={theme==="light"} className={theme==="light"?"selected":""}>☀ Light</button>
  <button type="button" disabled={saving} onClick={()=>void change("dark")} aria-pressed={theme==="dark"} className={theme==="dark"?"selected":""}>☾ Dark</button>
 </div>{error&&<p className="notice" role="alert">{error}</p>}</div>;
}
