
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

type Supplier={
 id:number
 name:string
}

type DraftLine={
 productId:number
 quantity:number
}

type ReceiptLine={
 id:number
 productId:number
 quantity:number
 product:Product
}

type ReceiptDocument={
 id:number
 status:string
 toLocation:string | null
 note:string | null
 createdAt:string
 validatedAt:string | null
 lines:ReceiptLine[]
 supplier:{
 id:number
 name:string
 } | null
}

export default function Receive(){

 const[products,setProducts]=useState<Product[]>([])
 const[suppliers,setSuppliers]=useState<Supplier[]>([])
 const[receipts,setReceipts]=useState<ReceiptDocument[]>([])
 const[productId,setProductId]=useState("")
 const[quantity,setQuantity]=useState("")
 const[draftLines,setDraftLines]=useState<DraftLine[]>([])
 const[supplierId,setSupplierId]=useState("")
 const[location,setLocation]=useState("Warehouse A")
 const[note,setNote]=useState("")
 const[loading,setLoading]=useState(true)
 const[saving,setSaving]=useState(false)
 const[validatingId,setValidatingId]=useState<number | null>(null)
 const[status,setStatus]=useState<{type:""|"ok"|"error",text:string}>({type:"",text:""})

 async function loadData(){
 try{
 setLoading(true)

 const [productRes,supplierRes,receiptRes]=await Promise.all([
 fetch("/api/products"),
 fetch("/api/suppliers"),
 fetch("/api/receipt")
 ])

 if(!productRes.ok) throw new Error("Could not load products")
 if(!supplierRes.ok) throw new Error("Could not load suppliers")
 if(!receiptRes.ok) throw new Error("Could not load receipts")

 const productPayload=await productRes.json()
 const supplierPayload=await supplierRes.json()
 const receiptPayload=await receiptRes.json()

 setProducts(productPayload)
 setSuppliers(supplierPayload)
 setReceipts(receiptPayload)

 if(productPayload.length>0 && !productId){
 setProductId(String(productPayload[0].id))
 }
 }catch(err:any){
 setStatus({type:"error",text:err?.message||"Could not load receive data"})
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

 const draftWithProduct=useMemo(()=>{
 return draftLines.map(line=>{
 const product=products.find(item=>item.id===line.productId)
 return{
 ...line,
 product
 }
 })
 },[draftLines,products])

 const pendingReceipts=useMemo(
 ()=>receipts.filter(receipt=>receipt.status==="PENDING"),
 [receipts]
 )

 function addLine(){
 const parsedQuantity=Number(quantity)

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

 async function createReceipt(e:FormEvent){
 e.preventDefault()

 if(draftLines.length===0){
 setStatus({type:"error",text:"Add at least one product line before creating a receipt."})
 return
 }

 try{
 setSaving(true)
 setStatus({type:"",text:""})
 const response=await fetch("/api/receipt",{
 method:"POST",
 headers:{"Content-Type":"application/json"},
 body:JSON.stringify({
 supplierId:supplierId || null,
 toLocation:location.trim()||null,
 note:note.trim()||null,
 items:draftLines
 })
 })

 if(!response.ok){
 const payload=await response.json().catch(()=>null)
 throw new Error(payload?.error||"Could not create receipt")
 }

 setDraftLines([])
 setNote("")
 setStatus({type:"ok",text:"Receipt created in pending state. Validate it to increase stock."})
 await loadData()
 }catch(err:any){
 setStatus({type:"error",text:err?.message||"Could not create receipt"})
 }finally{
 setSaving(false)
 }
 }

 async function validateReceipt(receiptId:number){
 try{
 setValidatingId(receiptId)
 setStatus({type:"",text:""})

 const response=await fetch(`/api/receipt/${receiptId}/validate`,{
 method:"POST"
 })

 if(!response.ok){
 const payload=await response.json().catch(()=>null)
 throw new Error(payload?.error||"Could not validate receipt")
 }

 setStatus({type:"ok",text:`Receipt #${receiptId} validated and stock increased.`})
 await loadData()
 }catch(err:any){
 setStatus({type:"error",text:err?.message||"Could not validate receipt"})
 }finally{
 setValidatingId(null)
 }
 }

 return(
 <div className="page-shell">
 <header className="page-header">
 <p className="page-kicker">Receipts</p>
 <h1 className="page-title">Log incoming goods</h1>
 <p className="page-copy">
 Add received quantities as soon as items arrive from vendors. Each validation increases stock automatically and writes a movement entry.
 </p>
 </header>

 <div className="split-grid">
 <section className="surface-card">
 <h2 className="surface-title">New receipt (pending)</h2>
 <form onSubmit={createReceipt}>
 <div className="form-grid">
 <div className="field">
 <label htmlFor="receive-supplier">Supplier</label>
 <select id="receive-supplier" className="input-control" value={supplierId} onChange={e=>setSupplierId(e.target.value)}>
 <option value="">No supplier selected</option>
 {suppliers.map(item=>(
 <option key={item.id} value={item.id}>{item.name}</option>
 ))}
 </select>
 </div>

 <div className="field">
 <label htmlFor="receive-location">Destination location</label>
 <input id="receive-location" className="input-control" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Warehouse A"/>
 </div>

 <div className="field">
 <label htmlFor="receive-note">Note</label>
 <input id="receive-note" className="input-control" value={note} onChange={e=>setNote(e.target.value)} placeholder="Invoice ref or memo"/>
 </div>
 </div>

 <div className="form-grid" style={{marginTop:12}}>
 <div className="field">
 <label htmlFor="receive-product">Add product line</label>
 <select id="receive-product" className="input-control" value={productId} onChange={e=>setProductId(e.target.value)} disabled={loading||products.length===0}>
 <option value="">Select product</option>
 {products.map(item=>(
 <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>
 ))}
 </select>
 </div>

 <div className="field">
 <label htmlFor="receive-qty">Quantity</label>
 <input id="receive-qty" className="input-control" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="50" inputMode="numeric"/>
 </div>
 </div>

 <div className="button-row">
 <button className="btn-secondary" type="button" onClick={addLine} disabled={saving||loading}>Add line</button>
 <button className="btn-primary" type="submit" disabled={saving||loading}>{saving?"Creating...":"Create pending receipt"}</button>
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
 <h2 className="surface-title">Selected product snapshot</h2>
 {!selectedProduct && <p className="empty-state">Pick a product to preview stock details.</p>}

 {selectedProduct && (
 <ul className="list-stack">
 <li className="list-row"><p className="list-row-copy">Product: {selectedProduct.name}</p><span className="badge neutral">ID {selectedProduct.id}</span></li>
 <li className="list-row"><p className="list-row-copy">Current stock: {selectedStock} {selectedProduct.unit}</p><span className={`badge ${selectedStock<selectedProduct.reorderLevel?"low":"ok"}`.trim()}>{selectedStock<selectedProduct.reorderLevel?"Low":"Stable"}</span></li>
 <li className="list-row"><p className="list-row-copy">Reorder level: {selectedProduct.reorderLevel}</p><span className="badge neutral">Policy</span></li>
 </ul>
 )}

 <p className="helper-line">Internal transfer and adjustment flows can reuse this same movement ledger with location tracking.</p>
 </section>
 </div>

 <section className="surface-card">
 <div className="surface-header">
 <h2 className="surface-title">Pending receipts</h2>
 <span className="badge neutral">{pendingReceipts.length} pending</span>
 </div>

 {pendingReceipts.length===0 && <p className="empty-state">No pending receipts.</p>}

 {pendingReceipts.length>0 && (
 <div className="table-wrap">
 <table className="data-table">
 <thead>
 <tr>
 <th>ID</th>
 <th>Supplier</th>
 <th>Lines</th>
 <th>Destination</th>
 <th>Created</th>
 <th>Action</th>
 </tr>
 </thead>
 <tbody>
 {pendingReceipts.map(item=>{
 return(
 <tr key={item.id}>
 <td>{item.id}</td>
 <td>{item.supplier?.name||"-"}</td>
 <td>{item.lines.length}</td>
 <td>{item.toLocation||"-"}</td>
 <td>{new Date(item.createdAt).toLocaleString()}</td>
 <td>
 <button type="button" className="btn-primary" onClick={()=>validateReceipt(item.id)} disabled={validatingId===item.id}>
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
