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

type TransferLine={
 id:number
 productId:number
 quantity:number
 product:Product
}

type TransferDocument={
 id:number
 status:string
 fromLocation:string | null
 toLocation:string | null
 note:string | null
 createdAt:string
 lines:TransferLine[]
}

export default function TransferPage(){
 const[products,setProducts]=useState<Product[]>([])
 const[transfers,setTransfers]=useState<TransferDocument[]>([])
 const[productId,setProductId]=useState("")
 const[quantity,setQuantity]=useState("")
 const[draftLines,setDraftLines]=useState<DraftLine[]>([])
 const[fromLocation,setFromLocation]=useState("Warehouse A")
 const[toLocation,setToLocation]=useState("Warehouse B")
 const[note,setNote]=useState("")
 const[loading,setLoading]=useState(true)
 const[saving,setSaving]=useState(false)
 const[status,setStatus]=useState<{type:""|"ok"|"error",text:string}>({type:"",text:""})

 async function loadData(){
 try{
 setLoading(true)

 const [productRes,transferRes]=await Promise.all([
 fetch("/api/products"),
 fetch("/api/transfer")
 ])

 if(!productRes.ok) throw new Error("Could not load products")
 if(!transferRes.ok) throw new Error("Could not load transfers")

 const productPayload=await productRes.json()
 const transferPayload=await transferRes.json()

 setProducts(productPayload)
 setTransfers(transferPayload)

 if(productPayload.length>0 && !productId){
 setProductId(String(productPayload[0].id))
 }
 }catch(err:any){
 setStatus({type:"error",text:err?.message||"Could not load transfer data"})
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

 const parsedQuantity=Number(quantity||0)
 const projectedSourceStock=selectedStock-(Number.isFinite(parsedQuantity)?parsedQuantity:0)

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

 async function submitTransfer(e:FormEvent){
 e.preventDefault()

 if(draftLines.length===0){
 setStatus({type:"error",text:"Add at least one product line before creating a transfer."})
 return
 }

 try{
 setSaving(true)
 setStatus({type:"",text:""})

 const response=await fetch("/api/transfer",{
 method:"POST",
 headers:{"Content-Type":"application/json"},
 body:JSON.stringify({
 fromLocation:fromLocation.trim(),
 toLocation:toLocation.trim(),
 note:note.trim()||null,
 items:draftLines
 })
 })

 if(!response.ok){
 const payload=await response.json().catch(()=>null)
 throw new Error(payload?.error||"Could not create transfer")
 }

 setDraftLines([])
 setNote("")
 setStatus({type:"ok",text:"Transfer validated successfully. Stock moved between warehouses."})
 await loadData()
 }catch(err:any){
 setStatus({type:"error",text:err?.message||"Could not create transfer"})
 }finally{
 setSaving(false)
 }
 }

 return(
 <div className="page-shell">
 <header className="page-header">
 <p className="page-kicker">Internal Transfer</p>
 <h1 className="page-title">Move stock between warehouses</h1>
 <p className="page-copy">
 Transfer quantities from one location to another while preserving a complete movement trail in the stock ledger.
 </p>
 </header>

 <div className="split-grid">
 <section className="surface-card">
 <h2 className="surface-title">New transfer</h2>
 <form onSubmit={submitTransfer}>
 <div className="form-grid">
 <div className="field">
 <label htmlFor="transfer-from">From location</label>
 <input id="transfer-from" className="input-control" value={fromLocation} onChange={e=>setFromLocation(e.target.value)} placeholder="Warehouse A"/>
 </div>

 <div className="field">
 <label htmlFor="transfer-to">To location</label>
 <input id="transfer-to" className="input-control" value={toLocation} onChange={e=>setToLocation(e.target.value)} placeholder="Warehouse B"/>
 </div>

 <div className="field">
 <label htmlFor="transfer-note">Note</label>
 <input id="transfer-note" className="input-control" value={note} onChange={e=>setNote(e.target.value)} placeholder="Reason or reference"/>
 </div>
 </div>

 <div className="form-grid" style={{marginTop:12}}>
 <div className="field">
 <label htmlFor="transfer-product">Product</label>
 <select id="transfer-product" className="input-control" value={productId} onChange={e=>setProductId(e.target.value)} disabled={loading||products.length===0}>
 <option value="">Select product</option>
 {products.map(item=>(
 <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>
 ))}
 </select>
 </div>

 <div className="field">
 <label htmlFor="transfer-qty">Quantity</label>
 <input id="transfer-qty" className="input-control" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="10" inputMode="numeric"/>
 </div>
 </div>

 <div className="button-row">
 <button type="button" className="btn-secondary" onClick={addLine} disabled={saving||loading}>Add line</button>
 <button type="submit" className="btn-primary" disabled={saving||loading}>{saving?"Transferring...":"Validate transfer"}</button>
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
 {(line.product?.name||`Product ${line.productId}`)} | Qty {line.quantity}
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
 <li className="list-row"><p className="list-row-copy">Projected stock after transfer out: {projectedSourceStock} {selectedProduct.unit}</p><span className={`badge ${projectedSourceStock<selectedProduct.reorderLevel?"low":"ok"}`.trim()}>{projectedSourceStock<selectedProduct.reorderLevel?"Low at source":"Within range"}</span></li>
 <li className="list-row"><p className="list-row-copy">Reorder threshold: {selectedProduct.reorderLevel}</p><span className="badge neutral">Policy</span></li>
 </ul>
 )}

 <p className="helper-line">Transfer writes both transfer-out and transfer-in ledger entries for audit consistency.</p>
 </section>
 </div>

 <section className="surface-card">
 <div className="surface-header">
 <h2 className="surface-title">Recent transfers</h2>
 <span className="badge neutral">{transfers.length} records</span>
 </div>

 {transfers.length===0 && <p className="empty-state">No transfers yet.</p>}

 {transfers.length>0 && (
 <div className="table-wrap">
 <table className="data-table">
 <thead>
 <tr>
 <th>ID</th>
 <th>From</th>
 <th>To</th>
 <th>Lines</th>
 <th>Status</th>
 <th>Created</th>
 </tr>
 </thead>
 <tbody>
 {transfers.map(item=>{
 return(
 <tr key={item.id}>
 <td>{item.id}</td>
 <td>{item.fromLocation||"-"}</td>
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
