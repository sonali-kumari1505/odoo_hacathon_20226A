
"use client"
import {FormEvent,useEffect,useMemo,useState} from "react"

import {calculateStockFromMovements} from "@/lib/stock"

type Movement={
 type:string
 quantity:number
}

type Product={
 id:number
 name:string
 sku:string
 unit:string
 reorderLevel:number
 movements:Movement[]
}

export default function Products(){

 const[name,setName]=useState("")
 const[sku,setSku]=useState("")
 const[unit,setUnit]=useState("")
 const[reorderLevel,setReorderLevel]=useState("10")
 const[editingId,setEditingId]=useState<number | null>(null)
 const[list,setList]=useState<Product[]>([])
 const[loading,setLoading]=useState(true)
 const[saving,setSaving]=useState(false)
 const[status,setStatus]=useState<{type:""|"ok"|"error",text:string}>({type:"",text:""})

 async function load(){
 try{
 setLoading(true)
 setStatus(prev=>prev.type==="error"?prev:{type:"",text:""})
 const r=await fetch("/api/products")
 if(!r.ok) throw new Error("Could not load products")
 const d=await r.json()
 setList(d)
 }catch(err:any){
 setStatus({type:"error",text:err?.message||"Could not load products"})
 }finally{
 setLoading(false)
 }
 }

 useEffect(()=>{load()},[])

 function resetForm(){
 setName("")
 setSku("")
 setUnit("")
 setReorderLevel("10")
 setEditingId(null)
 }

 async function create(e:FormEvent){
 e.preventDefault()
 const reorder=Number(reorderLevel)

 if(!name.trim() || !sku.trim() || !unit.trim()){
 setStatus({type:"error",text:"Name, SKU, and unit are required."})
 return
 }

 if(!Number.isInteger(reorder) || reorder<0){
 setStatus({type:"error",text:"Reorder level must be a non-negative whole number."})
 return
 }

 try{
 setSaving(true)
 setStatus({type:"",text:""})

 const endpoint=editingId===null
 ? "/api/products"
 : `/api/products/${editingId}`

 const method=editingId===null ? "POST" : "PUT"

 const response=await fetch(endpoint,{
 method,
 headers:{"Content-Type":"application/json"},
 body:JSON.stringify({
 name:name.trim(),
 sku:sku.trim(),
 unit:unit.trim(),
 reorderLevel:reorder
 })
 })

 if(!response.ok){
 const payload=await response.json().catch(()=>null)
 throw new Error(payload?.error||"Could not save product")
 }

 setStatus({
 type:"ok",
 text:editingId===null
 ? "Product created successfully."
 : "Product updated successfully."
 })

 resetForm()
 await load()
 }catch(err:any){
 setStatus({type:"error",text:err?.message||"Could not save product"})
 }finally{
 setSaving(false)
 }
 }

 async function removeProduct(product:Product){
 const proceed=window.confirm(`Delete ${product.name}? This action cannot be undone.`)
 if(!proceed) return

 try{
 setStatus({type:"",text:""})
 const response=await fetch(`/api/products/${product.id}`,{method:"DELETE"})

 if(!response.ok){
 const payload=await response.json().catch(()=>null)
 throw new Error(payload?.error||"Could not delete product")
 }

 if(editingId===product.id){
 resetForm()
 }

 setStatus({type:"ok",text:"Product deleted successfully."})
 await load()
 }catch(err:any){
 setStatus({type:"error",text:err?.message||"Could not delete product"})
 }
 }

 function startEdit(product:Product){
 setEditingId(product.id)
 setName(product.name)
 setSku(product.sku)
 setUnit(product.unit)
 setReorderLevel(String(product.reorderLevel))
 setStatus({type:"",text:""})
 }

 const rows=useMemo(()=>{
 return list.map(item=>{
 const stock=calculateStockFromMovements(item.movements||[])
 return{
 ...item,
 stock,
 movementCount:item.movements?.length||0,
 low:stock<item.reorderLevel
 }
 })
 },[list])

 return(
 <div className="page-shell">
 <header className="page-header">
 <p className="page-kicker">Product Management</p>
 <h1 className="page-title">Create and maintain your stock catalog</h1>
 <p className="page-copy">
 Register new items with SKU and unit of measure, then monitor movement count and low-stock risk directly from one table.
 </p>
 </header>

 <div className="split-grid">
 <section className="surface-card">
 <h2 className="surface-title">{editingId===null?"Add product":"Update product"}</h2>
 <p className="surface-copy">Use consistent SKU naming so warehouse searches stay fast and reliable.</p>

 <form onSubmit={create}>
 <div className="form-grid">
 <div className="field">
 <label htmlFor="name">Product name</label>
 <input id="name" className="input-control" placeholder="Steel Rod" value={name} onChange={e=>setName(e.target.value)}/>
 </div>

 <div className="field">
 <label htmlFor="sku">SKU code</label>
 <input id="sku" className="input-control" placeholder="STL-ROD-01" value={sku} onChange={e=>setSku(e.target.value)}/>
 </div>

 <div className="field">
 <label htmlFor="unit">Unit of measure</label>
 <input id="unit" className="input-control" placeholder="kg, pcs, box" value={unit} onChange={e=>setUnit(e.target.value)}/>
 </div>

 <div className="field">
 <label htmlFor="reorder-level">Reorder level</label>
 <input id="reorder-level" className="input-control" placeholder="10" value={reorderLevel} onChange={e=>setReorderLevel(e.target.value)} inputMode="numeric"/>
 </div>
 </div>

 <div className="button-row">
 <button type="submit" className="btn-primary" disabled={saving}>{saving?"Saving...":editingId===null?"Create product":"Update product"}</button>
 {editingId!==null && <button type="button" className="btn-secondary" onClick={resetForm}>Cancel edit</button>}
 <button type="button" className="btn-secondary" onClick={load} disabled={loading}>Reload list</button>
 </div>
 </form>

 {status.text && (
 <p className={`status-text ${status.type||""}`.trim()}>{status.text}</p>
 )}
 </section>

 <section className="surface-card">
 <h2 className="surface-title">Catalog checklist</h2>
 <ul className="list-stack">
 <li className="list-row"><p className="list-row-copy">Use clear product names for floor teams.</p><span className="badge neutral">Naming</span></li>
 <li className="list-row"><p className="list-row-copy">SKU should uniquely identify each variant.</p><span className="badge neutral">Control</span></li>
 <li className="list-row"><p className="list-row-copy">Choose one unit to avoid counting mismatch.</p><span className="badge neutral">Accuracy</span></li>
 <li className="list-row"><p className="list-row-copy">Review low-stock rows daily from dashboard alerts.</p><span className="badge low">Action</span></li>
 </ul>
 </section>
 </div>

 <section className="surface-card">
 <div className="surface-header">
 <h2 className="surface-title">Current products</h2>
 <span className="badge neutral">{rows.length} items</span>
 </div>

 {loading && <p className="surface-copy">Loading products...</p>}
 {!loading && rows.length===0 && <p className="empty-state">No products yet. Start by creating one above.</p>}

 {!loading && rows.length>0 && (
 <div className="table-wrap">
 <table className="data-table">
 <thead>
 <tr>
 <th>ID</th>
 <th>Name</th>
 <th>SKU</th>
 <th>Unit</th>
 <th>Reorder</th>
 <th>Movements</th>
 <th>Stock</th>
 <th>Status</th>
 <th>Actions</th>
 </tr>
 </thead>
 <tbody>
 {rows.map(row=>{
 return(
 <tr key={row.id}>
 <td>{row.id}</td>
 <td>{row.name}</td>
 <td>{row.sku}</td>
 <td>{row.unit}</td>
 <td>{row.reorderLevel}</td>
 <td>{row.movementCount}</td>
 <td>{row.stock}</td>
 <td><span className={`badge ${row.low?"low":"ok"}`.trim()}>{row.low?"Low":"Stable"}</span></td>
 <td>
 <div className="button-row compact-row">
 <button type="button" className="btn-secondary" onClick={()=>startEdit(row)}>Edit</button>
 <button type="button" className="btn-secondary" onClick={()=>removeProduct(row)}>Delete</button>
 </div>
 </td>
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
