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

type DraftLine={
 productId:number
 physicalCount:number
}

type AdjustmentLine={
 id:number
 productId:number
 quantity:number
 physicalCount:number | null
 stockBefore:number | null
 delta:number | null
 product:Product
}

type AdjustmentDocument={
 id:number
 status:string
 toLocation:string | null
 note:string | null
 createdAt:string
 lines:AdjustmentLine[]
}

export default function AdjustmentPage(){
 const[products,setProducts]=useState<Product[]>([])
 const[adjustments,setAdjustments]=useState<AdjustmentDocument[]>([])
 const[productId,setProductId]=useState("")
 const[physicalCount,setPhysicalCount]=useState("")
 const[draftLines,setDraftLines]=useState<DraftLine[]>([])
 const[location,setLocation]=useState("Warehouse A")
 const[note,setNote]=useState("")
 const[loading,setLoading]=useState(true)
 const[saving,setSaving]=useState(false)
 const[status,setStatus]=useState<{type:""|"ok"|"error",text:string}>({type:"",text:""})

 async function loadData(){
 try{
 setLoading(true)

 const [productRes,adjustmentRes]=await Promise.all([
 fetch("/api/products"),
 fetch("/api/adjustment")
 ])

 if(!productRes.ok) throw new Error("Could not load products")
 if(!adjustmentRes.ok) throw new Error("Could not load adjustments")

 const productPayload=await productRes.json()
 const adjustmentPayload=await adjustmentRes.json()

 setProducts(productPayload)
 setAdjustments(adjustmentPayload)

 if(productPayload.length>0 && !productId){
 setProductId(String(productPayload[0].id))
 }
 }catch(err:any){
 setStatus({type:"error",text:err?.message||"Could not load adjustment data"})
 }finally{
 setLoading(false)
 }
 }

 useEffect(()=>{loadData()},[])

 const selectedProduct=useMemo(
 ()=>products.find(item=>String(item.id)===productId),
 [products,productId]
 )

 const selectedStock=useMemo(()=>{
 if(!selectedProduct) return 0
 return calculateStockFromMovements(selectedProduct.movements)
 },[selectedProduct])

 const parsedPhysicalCount=Number(physicalCount||0)
 const projectedDelta=Number.isFinite(parsedPhysicalCount)
 ? parsedPhysicalCount-selectedStock
 : 0

 const draftWithProduct=useMemo(()=>{
 return draftLines.map(line=>{
 const product=products.find(item=>item.id===line.productId)
 return{
 ...line,
 product
 }
 })
 },[draftLines,products])

 function addLine(){
 if(!productId){
 setStatus({type:"error",text:"Select a product first."})
 return
 }

 if(!Number.isInteger(parsedPhysicalCount) || parsedPhysicalCount<0){
 setStatus({type:"error",text:"Physical count must be a non-negative whole number."})
 return
 }

 const parsedProductId=Number(productId)
 setDraftLines(current=>{
 const existing=current.find(line=>line.productId===parsedProductId)
 if(!existing){
 return[
 ...current,
 {productId:parsedProductId,physicalCount:parsedPhysicalCount}
 ]
 }

 return current.map(line=>{
 if(line.productId!==parsedProductId) return line
 return{
 ...line,
 physicalCount:parsedPhysicalCount
 }
 })
 })

 setPhysicalCount("")
 setStatus({type:"",text:""})
 }

 function removeLine(targetProductId:number){
 setDraftLines(current=>current.filter(line=>line.productId!==targetProductId))
 }

 async function submitAdjustment(e:FormEvent){
 e.preventDefault()

 if(draftLines.length===0){
 setStatus({type:"error",text:"Add at least one product line before applying an adjustment."})
 return
 }

 try{
 setSaving(true)
 setStatus({type:"",text:""})

 const response=await fetch("/api/adjustment",{
 method:"POST",
 headers:{"Content-Type":"application/json"},
 body:JSON.stringify({
 location:location.trim()||null,
 note:note.trim()||null,
 items:draftLines
 })
 })

 if(!response.ok){
 const payload=await response.json().catch(()=>null)
 throw new Error(payload?.error||"Could not create adjustment")
 }

 setDraftLines([])
 setNote("")
 setStatus({type:"ok",text:"Stock adjustment applied and ledger updated."})
 await loadData()
 }catch(err:any){
 setStatus({type:"error",text:err?.message||"Could not create adjustment"})
 }finally{
 setSaving(false)
 }
 }

 return(
 <div className="page-shell">
 <header className="page-header">
 <p className="page-kicker">Stock Adjustment</p>
 <h1 className="page-title">Align system stock with physical counts</h1>
 <p className="page-copy">
 Capture counted inventory and apply adjustment deltas so reported stock stays aligned with real warehouse quantities.
 </p>
 </header>

 <div className="split-grid">
 <section className="surface-card">
 <h2 className="surface-title">New adjustment</h2>
 <form onSubmit={submitAdjustment}>
 <div className="form-grid">
 <div className="field">
 <label htmlFor="adjust-location">Location</label>
 <input id="adjust-location" className="input-control" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Warehouse A"/>
 </div>

 <div className="field">
 <label htmlFor="adjust-note">Note</label>
 <input id="adjust-note" className="input-control" value={note} onChange={e=>setNote(e.target.value)} placeholder="Cycle count reference"/>
 </div>
 </div>

 <div className="form-grid" style={{marginTop:12}}>
 <div className="field">
 <label htmlFor="adjust-product">Product</label>
 <select id="adjust-product" className="input-control" value={productId} onChange={e=>setProductId(e.target.value)} disabled={loading||products.length===0}>
 <option value="">Select product</option>
 {products.map(item=>(
 <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>
 ))}
 </select>
 </div>

 <div className="field">
 <label htmlFor="adjust-count">Physical count</label>
 <input id="adjust-count" className="input-control" value={physicalCount} onChange={e=>setPhysicalCount(e.target.value)} placeholder="125" inputMode="numeric"/>
 </div>
 </div>

 <div className="button-row">
 <button type="button" className="btn-secondary" onClick={addLine} disabled={saving||loading}>Add line</button>
 <button type="submit" className="btn-primary" disabled={saving||loading}>{saving?"Applying...":"Apply adjustment"}</button>
 <button type="button" className="btn-secondary" onClick={loadData} disabled={loading}>Reload data</button>
 </div>
 </form>

 <ul className="list-stack" style={{marginTop:14}}>
 {draftWithProduct.length===0 && (
 <li className="list-row">
 <p className="list-row-copy">No product lines yet. Add one above.</p>
 <span className="badge neutral">Draft</span>
 </li>
 )}

 {draftWithProduct.map(line=>{
 return(
 <li key={line.productId} className="list-row">
 <p className="list-row-copy">
 {(line.product?.name||`Product ${line.productId}`)} | Physical {line.physicalCount}
 </p>
 <button type="button" className="btn-secondary" onClick={()=>removeLine(line.productId)}>Remove</button>
 </li>
 )
 })}
 </ul>

 {status.text && <p className={`status-text ${status.type||""}`.trim()}>{status.text}</p>}
 </section>

 <section className="surface-card">
 <h2 className="surface-title">Selected product snapshot</h2>
 {!selectedProduct && <p className="empty-state">Pick a product to preview stock details.</p>}

 {selectedProduct && (
 <ul className="list-stack">
 <li className="list-row"><p className="list-row-copy">Current stock: {selectedStock} {selectedProduct.unit}</p><span className="badge neutral">Current</span></li>
 <li className="list-row"><p className="list-row-copy">Projected delta from entered count: {projectedDelta}</p><span className={`badge ${projectedDelta===0?"neutral":projectedDelta>0?"ok":"low"}`.trim()}>{projectedDelta===0?"No change":projectedDelta>0?"Increase":"Decrease"}</span></li>
 <li className="list-row"><p className="list-row-copy">Reorder threshold: {selectedProduct.reorderLevel}</p><span className="badge neutral">Policy</span></li>
 </ul>
 )}

 <p className="helper-line">Adjustment movements store signed delta values so history clearly shows increases and decreases.</p>
 </section>
 </div>

 <section className="surface-card">
 <div className="surface-header">
 <h2 className="surface-title">Recent adjustments</h2>
 <span className="badge neutral">{adjustments.length} records</span>
 </div>

 {adjustments.length===0 && <p className="empty-state">No adjustments yet.</p>}

 {adjustments.length>0 && (
 <div className="table-wrap">
 <table className="data-table">
 <thead>
 <tr>
 <th>ID</th>
 <th>Location</th>
 <th>Lines</th>
 <th>Status</th>
 <th>Created</th>
 </tr>
 </thead>
 <tbody>
 {adjustments.map(item=>{
 return(
 <tr key={item.id}>
 <td>{item.id}</td>
 <td>{item.toLocation||"-"}</td>
 <td>{item.lines.length}</td>
 <td><span className="badge ok">{item.status}</span></td>
 <td>{new Date(item.createdAt).toLocaleString()}</td>
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
