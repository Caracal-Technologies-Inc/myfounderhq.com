"use client";
import React,{useEffect,useMemo,useRef,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";
import ThemeToggle from "./theme-toggle";
import FounderIdentity from "./founder-identity";

type Mode="email"|"password"|"phone"|null;
type Field="current"|"new"|"confirm"|"email"|"phone"|"otp"|"general";
type Feedback={type:"error"|"success";message:string;field:Field}|null;

export default function AccountSettings({userId,initialEmail,signOutAction}:{userId:string;initialEmail?:string;signOutAction:()=>Promise<void>}){
 const db=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),[]);
 const [email,setEmail]=useState(initialEmail||"");
 const [phone,setPhone]=useState("");
 const [pendingEmail,setPendingEmail]=useState("");
 const [mode,setMode]=useState<Mode>(null);
 const [value,setValue]=useState("");
 const [confirm,setConfirm]=useState("");
 const [currentPassword,setCurrentPassword]=useState("");
 const [otp,setOtp]=useState("");
 const [awaitingCode,setAwaitingCode]=useState(false);
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState("");
 const [feedback,setFeedback]=useState<Feedback>(null);
 const [resetFeedback,setResetFeedback]=useState<Feedback>(null);
 const currentRef=useRef<HTMLInputElement>(null);
 const newRef=useRef<HTMLInputElement>(null);
 const confirmRef=useRef<HTMLInputElement>(null);
 const emailRef=useRef<HTMLInputElement>(null);
 const phoneRef=useRef<HTMLInputElement>(null);
 const otpRef=useRef<HTMLInputElement>(null);

 useEffect(()=>{
  let active=true;
  const refresh=async()=>{
   const {data,error}=await db.auth.getUser();
   if(!active)return;
   if(error){setFeedback({type:"error",field:"general",message:"Account details could not be loaded. Please refresh."});return;}
   if(data.user?.id===userId){
    setEmail(data.user.email||"");
    setPhone(data.user.phone||"");
    setPendingEmail((data.user as typeof data.user&{new_email?:string}).new_email||"");
   }
  };
  void refresh();
  const {data:auth}=db.auth.onAuthStateChange(()=>{void refresh();});
  const onFocus=()=>{void refresh();};
  window.addEventListener("focus",onFocus);
  return()=>{active=false;auth.subscription.unsubscribe();window.removeEventListener("focus",onFocus);};
 },[db,userId]);

 const choose=(next:Mode)=>{
  if(busy)return;
  setMode(next);setValue("");setConfirm("");setCurrentPassword("");setOtp("");setAwaitingCode(false);
  setFeedback(null);setResetFeedback(null);
 };
 const errorFor=(field:Field)=>feedback?.type==="error"&&feedback.field===field?feedback.message:null;
 const fail=(message:string,field:Field,ref?:React.RefObject<HTMLInputElement|null>)=>{
  setFeedback({type:"error",field,message});
  ref?.current?.focus();
 };
 const clearError=(field:Field)=>setFeedback(prev=>prev?.type==="error"&&(prev.field===field||prev.field==="general")?null:prev);

 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!mode||busy)return;
  setFeedback(null);setResetFeedback(null);
  if(mode==="password"){
   if(!currentPassword){fail("Enter your current password.", "current",currentRef);return;}
   if(value.length<8){fail("Use at least 8 characters for the new password.","new",newRef);return;}
   if(value!==confirm){fail("New passwords do not match.","confirm",confirmRef);return;}
   if(value===currentPassword){fail("Choose a new password different from your current one.","new",newRef);return;}
  }
  setBusy(true);
  try{
   if(mode==="phone"&&awaitingCode){
    setProgress("Verifying phone…");
    const {data,error}=await db.auth.verifyOtp({phone:value.replace(/[\\s().-]/g,""),token:otp,type:"phone_change"});
    if(error){fail(error.message,"otp",otpRef);return;}
    setPhone(data.user?.phone||value);chooseAfterSuccess();
    setFeedback({type:"success",field:"phone",message:"Phone number verified and updated."});
   }else if(mode==="phone"){
    setProgress("Sending verification code…");
    const {error}=await db.auth.updateUser({phone:value.replace(/[\\s().-]/g,"")});
    if(error){const unconfigured=/unable to get sms provider|sms provider|sms is disabled|phone provider/i.test(error.message);fail(unconfigured?"Phone verification is unavailable because the SMS service has not been configured. No code was sent.":"Could not send verification code: "+error.message,"phone",phoneRef);return;}
    setAwaitingCode(true);
    setFeedback({type:"success",field:"phone",message:"Verification code requested. Enter the SMS code below to finish."});
   }else if(mode==="email"){
    setProgress("Requesting email change…");
    const {error}=await db.auth.updateUser({email:value.trim()},{emailRedirectTo:window.location.origin+"/auth/callback?next=/email-confirmed"});
    if(error){fail(error.message,"email",emailRef);return;}
    chooseAfterSuccess();
    setPendingEmail(value.trim());
    setFeedback({type:"success",field:"email",message:"Check BOTH your current and new email inboxes. Supabase may require confirmation from each before the address changes."});
   }else{
    setProgress("Verifying current password…");
    const {error:verifyError}=await db.auth.signInWithPassword({email,password:currentPassword});
    if(verifyError){
     const invalid=/invalid login credentials|invalid credentials|incorrect password/i.test(verifyError.message);
     fail(invalid?"Incorrect current password. Please try again.":"Could not verify your password: "+verifyError.message,"current",currentRef);
     return;
    }
    setProgress("Saving new password…");
    const {error}=await db.auth.updateUser({password:value});
    if(error){
     fail("Could not change password: "+error.message,"general");
     return;
    }
    chooseAfterSuccess();
    setFeedback({type:"success",field:"current",message:"Password changed successfully."});
   }
  }catch(err){
   setFeedback({type:"error",field:"general",message:err instanceof Error?err.message:"Could not update your account. Please try again."});
  }finally{setBusy(false);setProgress("");}
 }
 function chooseAfterSuccess(){
  setMode(null);setValue("");setConfirm("");setCurrentPassword("");setOtp("");setAwaitingCode(false);
 }
 async function sendPasswordReset(){
  if(!email||busy)return;
  setBusy(true);setResetFeedback(null);setProgress("Sending recovery email…");
  try{
   const redirectTo=window.location.origin+"/auth/callback?next=/reset-password";
   const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo});
   if(error)throw error;
   setResetFeedback({type:"success",field:"general",message:"Password reset email requested. Check your inbox for the recovery link."});
  }catch(err){
   setResetFeedback({type:"error",field:"general",message:err instanceof Error?err.message:"Unable to send password reset email."});
  }finally{setBusy(false);setProgress("");}
 }
 const message=(f:Feedback)=>f&&<p className={"settings-inline-message "+(f.type==="error"?"settings-inline-error":"settings-inline-success")} role={f.type==="error"?"alert":"status"} aria-live={f.type==="error"?"assertive":"polite"}>{f.message}</p>;

 return <section className="settings-workspace">
  <div className="eyebrow">Founder Operating System</div>
  <div className="header"><h1>Settings</h1></div>
  <div className="card settings-section"><h3>User Profile</h3>


   <div className="row"><strong>Email</strong><div className="settings-email-controls"><span className="settings-current-email">{email}</span><button className="settings-action-button" type="button" disabled={busy} onClick={()=>choose(mode==="email"?null:"email")}>Change email</button></div></div>
   {pendingEmail&&pendingEmail!==email&&<p className="settings-pending-email" role="status">Pending: <strong>{pendingEmail}</strong>. Confirm the links sent to your current and new email inboxes; the current email stays active until confirmation finishes.</p>}
   {mode==="email"&&<form className="settings-edit" onSubmit={submit} noValidate>
    <label>New email<input ref={emailRef} required type="email" autoComplete="email" value={value} aria-invalid={!!errorFor("email")} aria-describedby={errorFor("email")?"settings-email-error":undefined} onChange={e=>{setValue(e.target.value);clearError("email");}}/></label>
    {errorFor("email")&&<p id="settings-email-error" className="settings-inline-message settings-inline-error" role="alert">{errorFor("email")}</p>}
    {feedback?.field==="general"&&message(feedback)}
    <div><button type="submit" disabled={busy}>{busy?progress:"Request email change"}</button><button type="button" disabled={busy} onClick={()=>choose(null)}>Cancel</button></div>
   </form>}
   {mode!=="email"&&feedback?.field==="email"&&message(feedback)}

   <div className="row"><strong>Password</strong><div className="settings-password-buttons"><button className="settings-action-button" type="button" disabled={busy} onClick={()=>choose(mode==="password"?null:"password")}>Change password</button><button className="settings-action-button" type="button" disabled={busy} onClick={()=>void sendPasswordReset()}>{busy&&progress==="Sending recovery email…"?"Sending…":"Reset password"}</button></div></div>
   {mode==="password"&&<form className="settings-edit" onSubmit={submit} noValidate>
    <label>Current password<input ref={currentRef} required type="password" autoComplete="current-password" value={currentPassword} aria-invalid={!!errorFor("current")} aria-describedby={errorFor("current")?"settings-current-error":undefined} onChange={e=>{setCurrentPassword(e.target.value);clearError("current");}}/></label>
    {errorFor("current")&&<p id="settings-current-error" className="settings-inline-message settings-inline-error" role="alert">{errorFor("current")}</p>}
    <label>New password<input ref={newRef} required type="password" autoComplete="new-password" minLength={8} value={value} aria-invalid={!!errorFor("new")} aria-describedby={errorFor("new")?"settings-new-error":undefined} onChange={e=>{setValue(e.target.value);clearError("new");}}/></label>
    {errorFor("new")&&<p id="settings-new-error" className="settings-inline-message settings-inline-error" role="alert">{errorFor("new")}</p>}
    <label>Confirm new password<input ref={confirmRef} required type="password" autoComplete="new-password" minLength={8} value={confirm} aria-invalid={!!errorFor("confirm")} aria-describedby={errorFor("confirm")?"settings-confirm-error":undefined} onChange={e=>{setConfirm(e.target.value);clearError("confirm");}}/></label>
    {errorFor("confirm")&&<p id="settings-confirm-error" className="settings-inline-message settings-inline-error" role="alert">{errorFor("confirm")}</p>}
    {feedback?.field==="general"&&message(feedback)}
    {busy&&<p className="settings-progress" role="status">{progress}</p>}
    <div><button type="submit" disabled={busy}>{busy?progress:"Save password"}</button><button type="button" disabled={busy} onClick={()=>choose(null)}>Cancel</button></div>
   </form>}
   {mode!=="password"&&feedback?.type==="success"&&feedback.field==="current"&&message(feedback)}
   {resetFeedback&&message(resetFeedback)}

   <div className="row"><strong>Phone {phone&&<span className="settings-secondary-value">{phone}</span>}</strong><button className="settings-action-button" type="button" disabled={busy} onClick={()=>choose(mode==="phone"?null:"phone")}>{phone?"Change phone":"Add phone"}</button></div>
   {mode==="phone"&&<form className="settings-edit" onSubmit={submit} noValidate>
    <label>Phone with country code<input ref={phoneRef} required type="tel" autoComplete="tel" placeholder="+1 604 555 0123" disabled={awaitingCode||busy} value={value} aria-invalid={!!errorFor("phone")} onChange={e=>{setValue(e.target.value);clearError("phone");}}/></label>
    {errorFor("phone")&&message(feedback)}
    {awaitingCode&&<label>SMS verification code<input ref={otpRef} required inputMode="numeric" autoComplete="one-time-code" value={otp} aria-invalid={!!errorFor("otp")} onChange={e=>{setOtp(e.target.value);clearError("otp");}}/></label>}
    {errorFor("otp")&&message(feedback)}
    {feedback?.field==="general"&&message(feedback)}
    {feedback?.type==="success"&&feedback.field==="phone"&&message(feedback)}
    <div><button type="submit" disabled={busy}>{busy?progress:awaitingCode?"Verify phone":"Send verification code"}</button><button type="button" disabled={busy} onClick={()=>choose(null)}>Cancel</button></div>
   </form>}
   {mode!=="phone"&&feedback?.type==="success"&&feedback.field==="phone"&&message(feedback)}

   <div className="row settings-signout"><strong>Session</strong><form action={signOutAction}><button className="settings-signout-button" type="submit">Sign out</button></form></div>
  </div>
  <FounderIdentity userId={userId}/>
  <div className="card settings-section"><h3>Preferences</h3><div className="row"><strong>Theme</strong><ThemeToggle userId={userId}/></div></div>
  {mode===null&&feedback?.field==="general"&&message(feedback)}
 </section>;
}
