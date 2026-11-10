"use client";
import React,{useEffect,useMemo,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";
import ThemeToggle from "./theme-toggle";
type Mode="email"|"password"|"phone"|null;
export default function AccountSettings({userId,initialEmail,signOutAction}:{userId:string;initialEmail?:string;signOutAction:()=>Promise<void>}){
 const db=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),[]);
 const [email,setEmail]=useState(initialEmail||"");
 const [phone,setPhone]=useState("");
 const [mode,setMode]=useState<Mode>(null);
 const [value,setValue]=useState("");
 const [confirm,setConfirm]=useState("");
 const [currentPassword,setCurrentPassword]=useState("");
 const [otp,setOtp]=useState("");
 const [awaitingCode,setAwaitingCode]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 useEffect(()=>{let active=true;void db.auth.getUser().then(({data,error})=>{if(!active)return;if(error)setError("Unable to retrieve account details.");else if(data.user?.id===userId){setEmail(data.user.email||"");setPhone(data.user.phone||"");}});return()=>{active=false}},[db,userId]);
 const choose=(next:Mode)=>{setMode(next);setValue("");setConfirm("");setCurrentPassword("");setOtp("");setError("");setNotice("");setAwaitingCode(false);};
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!mode||busy)return;setError("");setNotice("");
  if(mode==="password"&&(!currentPassword||value.length<8||value!==confirm)){setError(!currentPassword?"Enter your current password.":value.length<8?"Use at least 8 characters.":"Passwords do not match.");return;}
  setBusy(true);
  try{
   if(mode==="phone"&&awaitingCode){
    const {data,error}=await db.auth.verifyOtp({phone:value.replace(/[\s().-]/g,""),token:otp,type:"phone_change"});
    if(error)throw error;setPhone(data.user?.phone||value);choose(null);setNotice("Phone number verified and updated.");
   }else if(mode==="phone"){
    const {error}=await db.auth.updateUser({phone:value.replace(/[\s().-]/g,"")});
    if(error)throw error;setAwaitingCode(true);setNotice("Enter the SMS verification code to confirm the new number.");
   }else if(mode==="email"){
    const {error}=await db.auth.updateUser({email:value.trim()});
    if(error)throw error;setNotice("Email change requested. Check your email for confirmation instructions.");setMode(null);setValue("");
   }else{
    const {error:verifyError}=await db.auth.signInWithPassword({email,password:currentPassword});
    if(verifyError)throw new Error("Current password is incorrect or could not be verified.");
    const {error}=await db.auth.updateUser({password:value});
    if(error)throw error;setNotice("Password changed.");setMode(null);setValue("");setConfirm("");setCurrentPassword("");
   }
  }catch(e){setError(e instanceof Error?e.message:"Unable to update account.");}
  finally{setBusy(false);}
 }
 async function sendPasswordReset(){
  if(!email||busy)return;
  setBusy(true);setError("");setNotice("");
  try{
   const redirectTo=window.location.origin+"/auth/callback?next=/reset-password";
   const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo});
   if(error)throw error;
   setNotice("Password reset email requested. Check your inbox and follow the link to choose a new password.");
  }catch(err){setError(err instanceof Error?err.message:"Unable to send password reset email.");}
  finally{setBusy(false);}
 }
 return <section className="settings-workspace">
  <div className="eyebrow">Founder Operating System</div>
  <div className="header"><h1>Settings</h1></div>
  <div className="card settings-section"><h3>User Profile</h3>
   <div className="row"><strong>Username</strong><span>{email}</span></div>
   <div className="row"><strong>Email</strong><button className="settings-action-button" type="button" onClick={()=>choose(mode==="email"?null:"email")}>Change email</button></div>
   {mode==="email"&&<form className="settings-edit" onSubmit={submit}><label>New email<input required type="email" autoComplete="email" value={value} onChange={e=>setValue(e.target.value)}/></label><div><button disabled={busy}>Request email change</button><button type="button" onClick={()=>choose(null)}>Cancel</button></div></form>}
   <div className="row"><strong>Password</strong><div className="settings-password-buttons"><button className="settings-action-button" type="button" onClick={()=>choose(mode==="password"?null:"password")}>Change password</button><button className="settings-action-button" type="button" disabled={busy} onClick={()=>void sendPasswordReset()}>Reset password</button></div></div>
   {mode==="password"&&<form className="settings-edit" onSubmit={submit}><label>Current password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label><label>New password<input required type="password" autoComplete="new-password" minLength={8} value={value} onChange={e=>setValue(e.target.value)}/></label><label>Confirm new password<input required type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><div><button disabled={busy}>Save password</button><button type="button" onClick={()=>choose(null)}>Cancel</button></div></form>}
   <div className="row"><strong>Phone {phone&&<span className="settings-secondary-value">{phone}</span>}</strong><button className="settings-action-button" type="button" onClick={()=>choose(mode==="phone"?null:"phone")}>{phone?"Change phone":"Add phone"}</button></div>
   {mode==="phone"&&<form className="settings-edit" onSubmit={submit}><label>Phone with country code<input required type="tel" autoComplete="tel" placeholder="+1 604 555 0123" disabled={awaitingCode} value={value} onChange={e=>setValue(e.target.value)}/></label>{awaitingCode&&<label>SMS verification code<input required inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e=>setOtp(e.target.value)}/></label>}<div><button disabled={busy}>{awaitingCode?"Verify phone":"Send verification code"}</button><button type="button" onClick={()=>choose(null)}>Cancel</button></div></form>}
   <div className="row settings-signout"><strong>Session</strong><form action={signOutAction}><button className="settings-signout-button" type="submit">Sign out</button></form></div>
  </div>
  <div className="card settings-section"><h3>Preferences</h3><div className="row"><strong>Theme</strong><ThemeToggle userId={userId}/></div></div>
  {error&&<p className="settings-feedback settings-feedback-error" role="alert">{error}</p>}
  {notice&&<p className="settings-feedback" role="status">{notice}</p>}
 </section>;
}
