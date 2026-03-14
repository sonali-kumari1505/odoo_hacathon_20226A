
"use client"
import {FormEvent,useEffect,useMemo,useState} from "react"

type Supplier={
 id:number
 name:string
 contact:string|null
}

export default function Suppliers(){

 const[name,setName]=useState("")
 const[contact,setContact]=useState("")
 const[list,setList]=useState<Supplier[]>([])
 const[loading,setLoading]=useState(true)
 const[saving,setSaving]=useState(false)
 const[status,setStatus]=useState<{type:""|"ok"|"error",text:string}>({type:"",text:""})

 async function load(){
 try{
 setLoading(true)
 const r=await fetch("/api/suppliers")
 if(!r.ok) throw new Error("Could not load suppliers")
 const d=await r.json()
 setList(d)
 }catch(err:any){
 setStatus({type:"error",text:err?.message||"Could not load suppliers"})
 }finally{
 setLoading(false)
 }
 }

 useEffect(()=>{load()},[])

 async function create(e:FormEvent){
 e.preventDefault()

 if(!name.trim()){
 setStatus({type:"error",text:"Supplier name is required."})
 return
 }

 try{
 setSaving(true)
 setStatus({type:"",text:""})
 const r=await fetch("/api/suppliers",{
 method:"POST",
 headers:{"Content-Type":"application/json"},
 body:JSON.stringify({name:name.trim(),contact:contact.trim()})
 })

 if(!r.ok){
 const b=await r.json().catch(()=>null)
 throw new Error(b?.error||"Could not create supplier")
 }

 setName("");setContact("")
 setStatus({type:"ok",text:"Supplier saved successfully."})
 await load()
 }catch(err:any){
 setStatus({type:"error",text:err?.message||"Could not create supplier"})
 }finally{
 setSaving(false)
 }
 }

 const withContact=useMemo(
 ()=>list.filter(item=>item.contact&&item.contact.trim().length>0).length,
 [list]
 )

 return(
 <div className="page-shell">
 <header className="page-header">
 <p className="page-kicker">Supplier Records</p>
 <h1 className="page-title">Manage your vendor network</h1>
 <p className="page-copy">
 Keep supplier details in one place so receipt operations can be logged with consistent source references.
 </p>
 </header>

 <section className="metric-grid">
 <article className="metric-card">
 <p className="metric-label">Total suppliers</p>
 <p className="metric-value">{list.length}</p>
 <p className="metric-note">Registered vendor profiles</p>
 </article>

 <article className="metric-card">
 <p className="metric-label">With contact details</p>
 <p className="metric-value">{withContact}</p>
 <p className="metric-note">Ready for direct follow-up</p>
 </article>

 <article className="metric-card">
 <p className="metric-label">Missing contact details</p>
 <p className="metric-value">{list.length-withContact}</p>
 <p className="metric-note">Needs enrichment</p>
 </article>

 <article className="metric-card">
 <p className="metric-label">Operational status</p>
 <p className="metric-value">Live</p>
 <p className="metric-note">Vendor catalog available</p>
 </article>
 </section>

 <div className="split-grid">
 <section className="surface-card">
 <h2 className="surface-title">Add supplier</h2>
 <p className="surface-copy">Capture at least a name now, then update contact details when available.</p>
 <form onSubmit={create}>
 <div className="form-grid">
 <div className="field">
 <label htmlFor="supplier-name">Supplier name</label>
 <input id="supplier-name" className="input-control" placeholder="ABC Metals" value={name} onChange={e=>setName(e.target.value)}/>
 </div>

 <div className="field">
 <label htmlFor="supplier-contact">Contact</label>
 <input id="supplier-contact" className="input-control" placeholder="Email or phone" value={contact} onChange={e=>setContact(e.target.value)}/>
 </div>
 </div>

 <div className="button-row">
 <button type="submit" className="btn-primary" disabled={saving}>{saving?"Saving...":"Add supplier"}</button>
 <button type="button" className="btn-secondary" onClick={load} disabled={loading}>Refresh list</button>
 </div>
 </form>

 {status.text && (
 <p className={`status-text ${status.type||""}`.trim()}>{status.text}</p>
 )}
 </section>

 <section className="surface-card">
 <h2 className="surface-title">Vendor quality tips</h2>
 <ul className="list-stack">
 <li className="list-row"><p className="list-row-copy">Standardize supplier names across invoices and receiving notes.</p><span className="badge neutral">Naming</span></li>
 <li className="list-row"><p className="list-row-copy">Include email or phone for fast issue resolution.</p><span className="badge neutral">Contact</span></li>
 <li className="list-row"><p className="list-row-copy">Review inactive records monthly to keep the list clean.</p><span className="badge neutral">Maintenance</span></li>
 </ul>
 </section>
 </div>

 <section className="surface-card">
 <div className="surface-header">
 <h2 className="surface-title">Supplier list</h2>
 <span className="badge neutral">{list.length} records</span>
 </div>

 {loading && <p className="surface-copy">Loading suppliers...</p>}
 {!loading && list.length===0 && <p className="empty-state">No suppliers yet. Add your first vendor above.</p>}

 {!loading && list.length>0 && (
 <div className="table-wrap">
 <table className="data-table">
 <thead>
 <tr>
 <th>ID</th>
 <th>Name</th>
 <th>Contact</th>
 <th>Status</th>
 </tr>
 </thead>
 <tbody>
 {list.map(item=>{
 const hasContact=!!item.contact?.trim()
 return(
 <tr key={item.id}>
 <td>{item.id}</td>
 <td>{item.name}</td>
 <td>{hasContact?item.contact:"-"}</td>
 <td><span className={`badge ${hasContact?"ok":"low"}`.trim()}>{hasContact?"Complete":"Pending"}</span></td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 )}
 </section>
 </div>
 )
}
