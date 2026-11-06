"use client";
import {useEffect,useState} from "react";

type Theme = "light" | "dark";
const KEY = "myfounderhq.theme";

export default function ThemeToggle(){
 const [theme,setTheme] = useState<Theme>("light");
 useEffect(()=>{
  let saved: string | null = null;
  try { saved = window.localStorage.getItem(KEY); } catch { /* Private browsing can block storage. */ }
  const chosen:Theme = saved === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = chosen;
  setTheme(chosen);
 },[]);
 function change(next:Theme){
  document.documentElement.dataset.theme = next;
  setTheme(next);
  try { window.localStorage.setItem(KEY,next); } catch { /* Preference remains active for this page. */ }
 }
 return <div className="theme-control" role="group" aria-label="Appearance">
  <button type="button" onClick={()=>change("light")} aria-pressed={theme==="light"} className={theme==="light"?"selected":""}>☀ Light</button>
  <button type="button" onClick={()=>change("dark")} aria-pressed={theme==="dark"} className={theme==="dark"?"selected":""}>☾ Dark</button>
 </div>;
}
