
"use client"
import {useEffect,useMemo,useRef,useState} from "react"
import Chart from "chart.js/auto"

import {movementDelta,movementDirection} from "@/lib/stock"

type HistoryRow={
 id:number
 productId:number
 type:string
 quantity:number
 location:string|null
 createdAt:string
 product:{
 id:number
 name:string
 sku:string
 unit:string
 }
}

type ProductRollup={
 key:string
 name:string
 sku:string
 inbound:number
 outbound:number
 net:number
}

export default function Analytics(){

 const[history,setHistory]=useState<HistoryRow[]>([])
 const[loading,setLoading]=useState(true)
 const[error,setError]=useState("")
 const canvasRef=useRef<HTMLCanvasElement|null>(null)
 const chartRef=useRef<Chart|null>(null)

 async function load(){
 try{
 setLoading(true)
 setError("")
 const r=await fetch("/api/history")
 if(!r.ok) throw new Error("Could not load analytics data")
 const d=await r.json()
 setHistory(d)
 }catch(err:any){
 setError(err?.message||"Could not load analytics data")
 }finally{
 setLoading(false)
 }
 }

 useEffect(()=>{
 load()
 },[])

 const inbound=useMemo(
 ()=>history
 .filter(item=>movementDirection(item.type)==="in")
 .reduce((sum,item)=>sum+item.quantity,0),
 [history]
 )

 const outbound=useMemo(
 ()=>history
 .filter(item=>movementDirection(item.type)==="out")
 .reduce((sum,item)=>sum+item.quantity,0),
 [history]
 )

 const byProduct=useMemo(()=>{
 const map=new Map<string,ProductRollup>()

 for(const row of history){
 const key=String(row.product?.id||row.productId)
 const existing=map.get(key) || {
 key,
 name:row.product?.name||`Product ${key}`,
 sku:row.product?.sku||"-",
 inbound:0,
 outbound:0,
 net:0
 }

 const type=String(row.type||"").toLowerCase()
 const direction=movementDirection(type)
 if(direction==="in") existing.inbound+=row.quantity
 if(direction==="out") existing.outbound+=row.quantity
 existing.net+=movementDelta(type,row.quantity)
 map.set(key,existing)
 }

 return Array.from(map.values()).sort((a,b)=>Math.abs(b.net)-Math.abs(a.net))
 },[history])

 useEffect(()=>{
 if(!canvasRef.current) return

 const labels=byProduct.slice(0,8).map(item=>item.name)
 const values=byProduct.slice(0,8).map(item=>item.net)

 if(chartRef.current){
 chartRef.current.destroy()
 chartRef.current=null
 }

 if(labels.length===0){
 return
 }

 chartRef.current=new Chart(canvasRef.current,{
 type:"bar",
 data:{
 labels,
 datasets:[{
 label:"Net movement by product",
 data:values,
 backgroundColor:values.map(value=>value>=0?"rgba(47,127,69,0.45)":"rgba(166,58,46,0.45)"),
 borderColor:values.map(value=>value>=0?"rgba(47,127,69,0.95)":"rgba(166,58,46,0.95)"),
 borderWidth:1,
 borderRadius:8
 }]
 },
 options:{
 responsive:true,
 maintainAspectRatio:false,
 plugins:{
 legend:{display:false}
 },
 scales:{
 y:{
 ticks:{precision:0}
 }
 }
 }
 })

 return()=>{
 if(chartRef.current){
 chartRef.current.destroy()
 chartRef.current=null
 }
 }
 },[byProduct])

 return(
 <div className="page-shell">
 <header className="page-header">
 <p className="page-kicker">Analytics</p>
 <h1 className="page-title">Movement insights and trend signals</h1>
 <p className="page-copy">
 Visualize inbound and outbound behavior to quickly identify products with strong stock growth or heavy dispatch pressure.
 </p>
 </header>

 <section className="metric-grid">
 <article className="metric-card">
 <p className="metric-label">Inbound total</p>
 <p className="metric-value">{inbound}</p>
 <p className="metric-note">Received quantity</p>
 </article>

 <article className="metric-card">
 <p className="metric-label">Outbound total</p>
 <p className="metric-value">{outbound}</p>
 <p className="metric-note">Delivered quantity</p>
 </article>

 <article className="metric-card">
 <p className="metric-label">Net movement</p>
 <p className="metric-value">{inbound-outbound}</p>
 <p className="metric-note">Inbound minus outbound</p>
 </article>

 <article className="metric-card">
 <p className="metric-label">Tracked products</p>
 <p className="metric-value">{byProduct.length}</p>
 <p className="metric-note">With movement activity</p>
 </article>
 </section>

 <div className="split-grid">
 <section className="surface-card">
 <div className="surface-header">
 <h2 className="surface-title">Net movement chart</h2>
 <button className="btn-secondary" onClick={load} disabled={loading}>Refresh data</button>
 </div>

 {loading && <p className="surface-copy">Loading analytics data...</p>}
 {!loading && error && <p className="status-text error">{error}</p>}
 {!loading && !error && byProduct.length===0 && <p className="empty-state">No movement data available yet.</p>}

 {!error && (
 <div className="chart-wrap">
 <canvas ref={canvasRef} className="chart-canvas"/>
 </div>
 )}
 </section>

 <section className="surface-card">
 <h2 className="surface-title">Top movement products</h2>
 {byProduct.length===0 && <p className="empty-state">Product movement insights will appear here.</p>}

 {byProduct.length>0 && (
 <ul className="list-stack">
 {byProduct.slice(0,8).map(item=>{
 return(
 <li className="list-row" key={item.key}>
 <p className="list-row-copy">
 {item.name} ({item.sku}) | In {item.inbound} / Out {item.outbound}
 </p>
 <span className={`badge ${item.net>=0?"ok":"low"}`.trim()}>
 Net {item.net}
 </span>
 </li>
 )
 })}
 </ul>
 )}
 </section>
 </div>
 </div>
 )
}
