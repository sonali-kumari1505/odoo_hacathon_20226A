
"use client"
import {useEffect,useMemo,useState} from "react"

import {movementDelta,movementDirection} from "@/lib/stock"

type HistoryRow={
 id:number
 productId:number
 type:string
 quantity:number
 location:string|null
 fromLocation:string|null
 toLocation:string|null
 note:string|null
 createdAt:string
 document:{
 id:number
 type:string
 status:string
 } | null
 product:{
 id:number
 name:string
 sku:string
 unit:string
 }
}

export default function History(){

 const[data,setData]=useState<HistoryRow[]>([])
 const[loading,setLoading]=useState(true)
 const[error,setError]=useState("")
 const[typeFilter,setTypeFilter]=useState("all")

 async function load(){
 try{
 setLoading(true)
 setError("")
 const r=await fetch("/api/history")
 if(!r.ok) throw new Error("Could not load movement history")
 const d=await r.json()
 setData(d)
 }catch(err:any){
 setError(err?.message||"Could not load movement history")
 }finally{
 setLoading(false)
 }
 }

 useEffect(()=>{load()},[])

 function matchesFilter(item:HistoryRow){
 const type=String(item.type||"").toLowerCase()

 if(typeFilter==="all") return true
 if(typeFilter==="receipt") return type==="receipt"
 if(typeFilter==="delivery") return type==="delivery"
 if(typeFilter==="transfer") return type==="transfer_in" || type==="transfer_out"
 if(typeFilter==="adjustment") return type==="adjustment"
 if(typeFilter==="manual") return type==="in" || type==="out"

 return false
 }

 const filtered=useMemo(()=>{
 return data.filter(matchesFilter)
 },[data,typeFilter])

 const inbound=useMemo(
 ()=>data
 .filter(item=>movementDirection(item.type)==="in")
 .reduce((sum,item)=>sum+item.quantity,0),
 [data]
 )

 const outbound=useMemo(
 ()=>data
 .filter(item=>movementDirection(item.type)==="out")
 .reduce((sum,item)=>sum+item.quantity,0),
 [data]
 )

 const adjustmentNet=useMemo(
 ()=>data
 .filter(item=>String(item.type||"").toLowerCase()==="adjustment")
 .reduce((sum,item)=>sum+item.quantity,0),
 [data]
 )

 return(
 <div className="page-shell">
 <header className="page-header">
 <p className="page-kicker">Stock Ledger</p>
 <h1 className="page-title">Movement history and audit trail</h1>
 <p className="page-copy">
 Review each incoming and outgoing movement with timestamp, product reference, and location to maintain transparent inventory operations.
 </p>
 </header>

 <section className="metric-grid">
 <article className="metric-card">
 <p className="metric-label">Total entries</p>
 <p className="metric-value">{data.length}</p>
 <p className="metric-note">Recorded in ledger</p>
 </article>

 <article className="metric-card">
 <p className="metric-label">Inbound quantity</p>
 <p className="metric-value">{inbound}</p>
 <p className="metric-note">Total received</p>
 </article>

 <article className="metric-card">
 <p className="metric-label">Outbound quantity</p>
 <p className="metric-value">{outbound}</p>
 <p className="metric-note">Total delivered</p>
 </article>

 <article className="metric-card">
 <p className="metric-label">Net movement</p>
 <p className="metric-value">{inbound-outbound}</p>
 <p className="metric-note">Inbound minus outbound</p>
 </article>

 <article className="metric-card">
 <p className="metric-label">Adjustment net</p>
 <p className="metric-value">{adjustmentNet}</p>
 <p className="metric-note">Signed stock correction</p>
 </article>
 </section>

 <section className="surface-card">
 <div className="surface-header">
 <h2 className="surface-title">Movement log</h2>
 <div className="button-row compact-row">
 <select className="input-control" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
 <option value="all">All types</option>
 <option value="receipt">Receipts only</option>
 <option value="delivery">Deliveries only</option>
 <option value="transfer">Transfers only</option>
 <option value="adjustment">Adjustments only</option>
 <option value="manual">Manual in/out only</option>
 </select>
 <button className="btn-secondary" onClick={load} disabled={loading}>Refresh</button>
 </div>
 </div>

 {loading && <p className="surface-copy">Loading movement history...</p>}
 {!loading && error && <p className="status-text error">{error}</p>}
 {!loading && !error && filtered.length===0 && <p className="empty-state">No entries match this filter.</p>}

 {!loading && !error && filtered.length>0 && (
 <div className="table-wrap">
 <table className="data-table">
 <thead>
 <tr>
 <th>Time</th>
 <th>Product</th>
 <th>SKU</th>
 <th>Type</th>
 <th>Effect</th>
 <th>Qty</th>
 <th>Location</th>
 <th>From</th>
 <th>To</th>
 <th>Reference</th>
 </tr>
 </thead>

 <tbody>
 {filtered.map(item=>{
 const type=String(item.type||"").toLowerCase()
 const direction=movementDirection(type)
 const effect=movementDelta(type,item.quantity)
 return(
 <tr key={item.id}>
 <td>{new Date(item.createdAt).toLocaleString()}</td>
 <td>{item.product?.name||"Unknown product"}</td>
 <td>{item.product?.sku||"-"}</td>
 <td>
 <span className={`badge ${direction==="in"?"in":direction==="out"?"out":direction==="adjustment"?"neutral":"neutral"}`.trim()}>
 {type.toUpperCase()}
 </span>
 </td>
 <td>{effect>0?`+${effect}`:String(effect)}</td>
 <td>{item.quantity}</td>
 <td>{item.location||"-"}</td>
 <td>{item.fromLocation||"-"}</td>
 <td>{item.toLocation||"-"}</td>
 <td>{item.document?`${item.document.type} #${item.document.id}`:item.note||"-"}</td>
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
