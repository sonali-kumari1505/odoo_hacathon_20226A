"use client"

import Link from "next/link"
import {useRouter} from "next/navigation"
import {useState} from "react"

export default function LoginPage(){
 const router=useRouter()

 const[email,setEmail]=useState("")
 const[password,setPassword]=useState("")
 const[loading,setLoading]=useState(false)
 const[error,setError]=useState("")

 async function onSubmit(event:React.FormEvent<HTMLFormElement>){
 event.preventDefault()
 setLoading(true)
 setError("")

 try{
 const response=await fetch("/api/auth/login",{
 method:"POST",
 headers:{"Content-Type":"application/json"},
 body:JSON.stringify({email,password})
 })

 const payload=await response.json()

 if(!response.ok){
 setError(payload?.error || "Unable to log in")
 return
 }

 router.push("/")
 router.refresh()
 }catch{
 setError("Unable to log in")
 }finally{
 setLoading(false)
 }
 }

 return(
 <div className="auth-shell">
 <section className="auth-panel">
 <p className="page-kicker">Welcome Back</p>
 <h1 className="page-title">Sign in to CoreInventory</h1>
 <p className="page-copy">
 Access your inventory dashboard, movement ledger, and supplier records from one secure workspace.
 </p>
 </section>

 <section className="auth-card">
 <h2 className="surface-title">Log in</h2>
 <p className="surface-copy">Use your registered email and password.</p>

 <form className="auth-form" onSubmit={onSubmit}>
 <div className="field">
 <label htmlFor="login-email">Email</label>
 <input
 id="login-email"
 className="input-control"
 type="email"
 value={email}
 onChange={event=>setEmail(event.target.value)}
 required
 autoComplete="email"
 />
 </div>

 <div className="field">
 <label htmlFor="login-password">Password</label>
 <input
 id="login-password"
 className="input-control"
 type="password"
 value={password}
 onChange={event=>setPassword(event.target.value)}
 required
 autoComplete="current-password"
 />
 </div>

 {error && <p className="status-text error">{error}</p>}

 <div className="button-row">
 <button className="btn-primary" type="submit" disabled={loading}>
 {loading ? "Signing in..." : "Sign in"}
 </button>
 </div>
 </form>

 <p className="auth-footnote">
 Need an account? <Link href="/signup">Create one</Link>
 </p>
 </section>
 </div>
 )
}
