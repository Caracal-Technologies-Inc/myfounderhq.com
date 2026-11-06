import {cookies} from "next/headers";
import {createServerClient} from "@supabase/ssr";
export function isConfigured(){return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)}
export async function supabaseServer(){
  const cookieStore=await cookies();
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key) throw new Error("Supabase connection is not configured");
  return createServerClient(url,key,{cookies:{getAll(){return cookieStore.getAll()},setAll(toSet){try{toSet.forEach(({name,value,options})=>cookieStore.set(name,value,options))}catch{/* Server Component rendering cannot write cookies; proxy refreshes sessions. */}}}});
}
