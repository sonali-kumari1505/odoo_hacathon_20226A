
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
 quantity:number
}

type DeliveryLine={
 id:number
 productId:number
 quantity:number
 product:Product
}

type DeliveryDocument={
 id:number
 status:string
 fromLocation:string | null
 note:string | null
 createdAt:string
 validatedAt:string | null
 lines:DeliveryLine[]
}

export default function Deliver(){

 const[products,setProducts]=useState<Product[]>([])
 const[deliveries,setDeliveries]=useState<DeliveryDocument[]>([])
 const[productId,setProductId]=useState("")
 const[quantity,setQuantity]=useState("")
 const[draftLines,setDraftLines]=useState<DraftLine[]>([])
 const[location,setLocation]=useState("Warehouse A")
 const[note,setNote]=useState("")
 const[loading,setLoading]=useState(true)
 const[saving,setSaving]=useState(false)
 const[validatingId,setValidatingId]=useState<number | null>(null)
 const[status,setStatus]=useState<{type:""|"ok"|"error",text:string}>({type:"",text:""})

 async function loadData(){
 try{
 setLoading(true)

 const [productRes,deliveryRes]=await Promise.all([
 fetch("/api/products"),
 fetch("/api/delivery")
 ])

 if(!productRes.ok) throw new Error("Could not load products")
 if(!deliveryRes.ok) throw new Error("Could not load deliveries")

 const productPayload=await productRes.json()
 const deliveryPayload=await deliveryRes.json()

 setProducts(productPayload)
 setDeliveries(deliveryPayload)
 if(productPayload.length>0 && !productId){
 setProductId(String(productPayload[0].id))
 }
 }catch(err:any){
 setStatus({type:"error",text:err?.message||"Could not load delivery data"})
 }finally{
 setLoading(false)
 }
 }

 useEffect(()=>{loadData()},[])

 const selectedProduct=useMemo(
 ()=>products.find(p=>String(p.id)===productId),
 [products,productId]
 )

 const selectedStock=useMemo(()=>{
 if(!selectedProduct) return 0
 return calculateStockFromMovements(selectedProduct.movements)
 },[selectedProduct])

 const parsedQuantity=Number(quantity||0)
 const projectedStock=selectedStock-(Number.isFinite(parsedQuantity)?parsedQuantity:0)

 const draftWithProduct=useMemo(()=>{
 return draftLines.map(line=>{
 const product=products.find(item=>item.id===line.productId)
 return{
 ...line,
 product
 }
 })
 },[draftLines,products])

 const pendingDeliveries=useMemo(
 ()=>deliveries.filter(delivery=>delivery.status==="PENDING"),
 [deliveries]
 )

 function addLine(){
 if(!productId){
 setStatus({type:"error",text:"Select a product first."})
 return
 }

 if(!Number.isInteger(parsedQuantity) || parsedQuantity<=0){
 setStatus({type:"error",text:"Quantity must be a positive whole number."})
 return
 }

 const parsedProductId=Number(productId)
 setDraftLines(current=>{
 const existing=current.find(line=>line.productId===parsedProductId)
 if(!existing){
 return[
 ...current,
 {productId:parsedProductId,quantity:parsedQuantity}
 ]
 }

 return current.map(line=>{
 if(line.productId!==parsedProductId) return line
 return{
 ...line,
 quantity:line.quantity+parsedQuantity
 }
 })
 })

 setQuantity("")
 setStatus({type:"",text:""})
 }

 function removeLine(targetProductId:number){
 setDraftLines(current=>current.filter(line=>line.productId!==targetProductId))
 }

 async function createDelivery(e:FormEvent){
 e.preventDefault()

 if(draftLines.length===0){
 setStatus({type:"error",text:"Add at least one product line before creating a delivery."})
 return
 }

 try{
 setSaving(true)
 setStatus({type:"",text:""})

 const response=await fetch("/api/delivery",{
 method:"POST",
 headers:{"Content-Type":"application/json"},
 body:JSON.stringify({
 fromLocation:location.trim()||null,
 note:note.trim()||null,
 items:draftLines
 })
 })

 if(!response.ok){
 const payload=await response.json().catch(()=>null)
 throw new Error(payload?.error||"Could not create delivery")
 }

 setDraftLines([])
 setNote("")
 setStatus({type:"ok",text:"Delivery created in pending state. Validate it to decrease stock."})
 await loadData()
 }catch(err:any){
 setStatus({type:"error",text:err?.message||"Could not create delivery"})
 }finally{
 setSaving(false)
 }
 }

 async function validateDelivery(deliveryId:number){
 try{
 setValidatingId(deliveryId)
 setStatus({type:"",text:""})

 const response=await fetch(`/api/delivery/${deliveryId}/validate`,{method:"POST"})
 const payload=await response.json().catch(()=>null)

 if(!response.ok){
 const shortages=Array.isArray(payload?.shortages) ? payload.shortages : []
 const shortageText=shortages.length>0
 ? `${shortages[0].productName||"Product"} needs ${shortages[0].required}, available ${shortages[0].available}.`
 : ""
 throw new Error([payload?.error||"Could not validate delivery",shortageText].filter(Boolean).join(" "))
 }

 setStatus({type:"ok",text:`Delivery #${deliveryId} validated and stock decreased.`})
 await loadData()
 }catch(err:any){
 setStatus({type:"error",text:err?.message||"Could not validate delivery"})
 }finally{
 setValidatingId(null)
 }
 }

 return(
 <div className="page-shell">
 <header className="page-header">
 <p className="page-kicker">Delivery Orders</p>
 <h1 className="page-title">Process outgoing goods</h1>
 <p className="page-copy">
 Validate outbound quantities before dispatch. Every confirmed delivery decreases stock and adds a time-stamped movement in the ledger.
 </p>
 </header>

 <div className="split-grid">
 <section className="surface-card">
 <h2 className="surface-title">New delivery (pending)</h2>
 <form onSubmit={createDelivery}>
 <div className="form-grid">
 <div className="field">
 <label htmlFor="deliver-location">Source location</label>
 <input id="deliver-location" className="input-control" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Warehouse A"/>
 </div>

 <div className="field">
 <label htmlFor="deliver-note">Note</label>
 <input id="deliver-note" className="input-control" value={note} onChange={e=>setNote(e.target.value)} placeholder="Order reference"/>
 </div>
 </div>

 <div className="form-grid" style={{marginTop:12}}>
 <div className="field">
 <label htmlFor="deliver-product">Product</label>
 <select id="deliver-product" className="input-control" value={productId} onChange={e=>setProductId(e.target.value)} disabled={loading||products.length===0}>
 <option value="">Select product</option>
 {products.map(item=>(
 <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>
 ))}
 </select>
 </div>

 <div className="field">
 <label htmlFor="deliver-qty">Quantity delivered</label>
 <input id="deliver-qty" className="input-control" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="20" inputMode="numeric"/>
 </div>
 </div>

 <div className="button-row">
 <button className="btn-secondary" type="button" onClick={addLine} disabled={saving||loading}>Add line</button>
 <button className="btn-primary" type="submit" disabled={saving||loading}>{saving?"Creating...":"Create pending delivery"}</button>
 <button className="btn-secondary" type="button" onClick={loadData} disabled={loading}>Reload data</button>
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
 {(line.product?.name||`Product ${line.productId}`)} | Qty {line.quantity}
 </p>
 <button type="button" className="btn-secondary" onClick={()=>removeLine(line.productId)}>Remove</button>
 </li>
 )
 })}
 </ul>

 {status.text && (
 <p className={`status-text ${status.type||""}`.trim()}>{status.text}</p>
 )}
 </section>

 <section className="surface-card">
 <h2 className="surface-title">Stock impact preview</h2>
 {!selectedProduct && <p className="empty-state">Pick a product to preview delivery impact.</p>}

 {selectedProduct && (
 <ul className="list-stack">
 <li className="list-row"><p className="list-row-copy">Current stock: {selectedStock} {selectedProduct.unit}</p><span className="badge neutral">Current</span></li>
 <li className="list-row"><p className="list-row-copy">Projected stock after delivery: {projectedStock} {selectedProduct.unit}</p><span className={`badge ${projectedStock<selectedProduct.reorderLevel?"low":"ok"}`.trim()}>{projectedStock<selectedProduct.reorderLevel?"Low after issue":"Within range"}</span></li>
 <li className="list-row"><p className="list-row-copy">Reorder threshold: {selectedProduct.reorderLevel}</p><span className="badge neutral">Policy</span></li>
 </ul>
 )}

 <p className="helper-line">If stock goes below reorder threshold, an alert appears on Dashboard.</p>
 </section>
 </div>

 <section className="surface-card">
 <div className="surface-header">
 <h2 className="surface-title">Pending deliveries</h2>
 <span className="badge neutral">{pendingDeliveries.length} pending</span>
 </div>

 {pendingDeliveries.length===0 && <p className="empty-state">No pending deliveries.</p>}

 {pendingDeliveries.length>0 && (
 <div className="table-wrap">
 <table className="data-table">
 <thead>
 <tr>
 <th>ID</th>
 <th>Lines</th>
 <th>Source</th>
 <th>Created</th>
 <th>Action</th>
 </tr>
 </thead>
 <tbody>
 {pendingDeliveries.map(item=>{
 return(
 <tr key={item.id}>
 <td>{item.id}</td>
 <td>{item.lines.length}</td>
 <td>{item.fromLocation||"-"}</td>
 <td>{new Date(item.createdAt).toLocaleString()}</td>
 <td>
 <button type="button" className="btn-primary" onClick={()=>validateDelivery(item.id)} disabled={validatingId===item.id}>
 {validatingId===item.id?"Validating...":"Validate"}
 </button>
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
