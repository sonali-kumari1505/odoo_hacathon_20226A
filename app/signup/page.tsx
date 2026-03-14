"use client"

import Link from "next/link"
import {useRouter} from "next/navigation"
import {useState} from "react"

export default function SignupPage(){
 const router=useRouter()

 const[name,setName]=useState("")
 const[email,setEmail]=useState("")
 const[password,setPassword]=useState("")
 const[loading,setLoading]=useState(false)
 const[error,setError]=useState("")

 async function onSubmit(event:React.FormEvent<HTMLFormElement>){
 event.preventDefault()
 setLoading(true)
 setError("")

 try{
 const response=await fetch("/api/auth/signup",{
 method:"POST",
 headers:{"Content-Type":"application/json"},
 body:JSON.stringify({name,email,password})
 })

 const payload=await response.json()

 if(!response.ok){
 setError(payload?.error || "Unable to create account")
 return
 }

 router.push("/")
 router.refresh()
 }catch{
 setError("Unable to create account")
 }finally{
 setLoading(false)
 }
 }

 return(
 <div className="auth-shell">
 <section className="auth-panel">
 <p className="page-kicker">Create Account</p>
 <h1 className="page-title">Get started with CoreInventory</h1>
 <p className="page-copy">
 Create your login to manage stock movement, products, suppliers, and audit trails in one place.
 </p>
 </section>

 <section className="auth-card">
 <h2 className="surface-title">Sign up</h2>
 <p className="surface-copy">Create a secure account in a few seconds.</p>

 <form className="auth-form" onSubmit={onSubmit}>
 <div className="field">
 <label htmlFor="signup-name">Name</label>
 <input
 id="signup-name"
 className="input-control"
 type="text"
 value={name}
 onChange={event=>setName(event.target.value)}
 autoComplete="name"
 />
 </div>

 <div className="field">
 <label htmlFor="signup-email">Email</label>
 <input
 id="signup-email"
 className="input-control"
 type="email"
 value={email}
 onChange={event=>setEmail(event.target.value)}
 required
 autoComplete="email"
 />
 </div>

 <div className="field">
 <label htmlFor="signup-password">Password</label>
 <input
 id="signup-password"
 className="input-control"
 type="password"
 value={password}
 onChange={event=>setPassword(event.target.value)}
 required
 minLength={6}
 autoComplete="new-password"
 />
 </div>

 {error && <p className="status-text error">{error}</p>}

 <div className="button-row">
 <button className="btn-primary" type="submit" disabled={loading}>
 {loading ? "Creating account..." : "Create account"}
 </button>
 </div>
 </form>

 <p className="auth-footnote">
 Already have an account? <Link href="/login">Sign in</Link>
 </p>
 </section>
 </div>
 )
}
