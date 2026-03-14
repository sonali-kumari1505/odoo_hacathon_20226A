
"use client"
import {useEffect,useMemo,useState} from "react"

type ProductRow={
 id:number
 name:string
 sku:string
 unit:string
 reorderLevel:number
 stock:number
 movementCount:number
 low:boolean
}

type DashboardData={
 totals:{
 products:number
 movements:number
 stock:number
 lowStock:number
 pendingReceipts:number
 pendingDeliveries:number
 }
 productRows:ProductRow[]
 lowStockItems:ProductRow[]
}

export default function Dashboard(){

 const[data,setData]=useState<DashboardData | null>(null)
 const[loading,setLoading]=useState(true)
 const[error,setError]=useState("")

 async function load(){
  try{
  setLoading(true)
  setError("")
    const response=await fetch("/api/dashboard")
    if(!response.ok) throw new Error("Could not load dashboard")
    const payload=await response.json()
    setData(payload)
  }catch(err:any){
    setError(err?.message||"Could not load dashboard")
  }finally{
  setLoading(false)
  }
 }

 useEffect(()=>{load()},[])

 const rows=useMemo(()=>data?.productRows||[],[data])
 const lowStock=useMemo(()=>data?.lowStockItems||[],[data])
 const totals=data?.totals

 return(
 <div className="page-shell">
 <header className="page-header">
 <p className="page-kicker">Dashboard View</p>
 <h1 className="page-title">Live inventory command center</h1>
 <p className="page-copy">
 Keep receipts, deliveries, and balance checks in one workflow. This screen highlights total movement activity and products that need immediate restocking.
 </p>
 </header>

 <section className="metric-grid">
 <article className="metric-card">
 <p className="metric-label">Total products</p>
 <p className="metric-value">{totals?.products||0}</p>
 <p className="metric-note">Active catalog items</p>
 </article>

 <article className="metric-card">
 <p className="metric-label">Total movements</p>
 <p className="metric-value">{totals?.movements||0}</p>
 <p className="metric-note">Ledger entries processed</p>
 </article>

 <article className="metric-card">
 <p className="metric-label">Current net stock</p>
 <p className="metric-value">{totals?.stock||0}</p>
 <p className="metric-note">Across all products</p>
 </article>

 <article className="metric-card">
 <p className="metric-label">Low stock alerts</p>
 <p className="metric-value">{totals?.lowStock||0}</p>
 <p className="metric-note">Below reorder level</p>
 </article>

 <article className="metric-card">
 <p className="metric-label">Pending receipts</p>
 <p className="metric-value">{totals?.pendingReceipts||0}</p>
 <p className="metric-note">Awaiting validation</p>
 </article>

 <article className="metric-card">
 <p className="metric-label">Pending deliveries</p>
 <p className="metric-value">{totals?.pendingDeliveries||0}</p>
 <p className="metric-note">Awaiting validation</p>
 </article>
 </section>

 <section className="surface-card">
 <div className="surface-header">
 <h2 className="surface-title">Stock by product</h2>
 <button className="btn-secondary" onClick={load} disabled={loading}>Refresh</button>
 </div>

 {loading && <p className="surface-copy">Loading latest inventory data...</p>}
 {!loading && error && <p className="status-text error">{error}</p>}
 {!loading && !error && rows.length===0 && (
 <p className="empty-state">No products found yet. Add your first item from the Products page.</p>
 )}

 {!loading && !error && rows.length>0 && (
 <div className="table-wrap">
 <table className="data-table">
 <thead>
 <tr>
 <th>Product</th>
 <th>SKU</th>
 <th>Unit</th>
 <th>Movements</th>
 <th>Stock</th>
 <th>Status</th>
 </tr>
 </thead>
 <tbody>
 {rows.map(row=>{
 return(
 <tr key={row.id}>
 <td>{row.name}</td>
 <td>{row.sku}</td>
 <td>{row.unit}</td>
 <td>{row.movementCount}</td>
 <td>{row.stock}</td>
 <td>
 <span className={`badge ${row.low?"low":"ok"}`.trim()}>
 {row.low?"Reorder needed":"Healthy"}
 </span>
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 )}
 </section>

 <div className="split-grid">
 <section className="surface-card">
 <h2 className="surface-title">Priority actions</h2>
 <p className="surface-copy">Keep these quick checks as part of your daily operations.</p>
 <ul className="list-stack">
 {!loading && !error && lowStock.length===0 && (
 <li className="list-row">
 <p className="list-row-copy">No low-stock products right now.</p>
 <span className="badge ok">Clear</span>
 </li>
 )}

 {lowStock.map(row=>{
 return(
 <li key={row.id} className="list-row">
 <p className="list-row-copy">{row.name} is at {row.stock} {row.unit} (reorder {row.reorderLevel})</p>
 <span className="badge low">Low stock</span>
 </li>
 )
 })}
 </ul>
 <p className="helper-line">
 Pending receipts: {totals?.pendingReceipts||0} | Pending deliveries: {totals?.pendingDeliveries||0}
 </p>
 </section>

 <section className="surface-card">
 <h2 className="surface-title">Operational flow</h2>
 <p className="surface-copy">Core steps that match your inventory lifecycle.</p>
 <ul className="list-stack">
 <li className="list-row"><p className="list-row-copy">1. Receive goods from supplier</p><span className="badge neutral">Step</span></li>
 <li className="list-row"><p className="list-row-copy">2. Move stock to the right rack location</p><span className="badge neutral">Step</span></li>
 <li className="list-row"><p className="list-row-copy">3. Deliver finished goods to customers</p><span className="badge neutral">Step</span></li>
 <li className="list-row"><p className="list-row-copy">4. Adjust damaged or counted differences</p><span className="badge neutral">Step</span></li>
 </ul>
 <p className="helper-line">Every movement is captured in History as your stock ledger trail.</p>
 </section>
 </div>
 </div>
 )
}
