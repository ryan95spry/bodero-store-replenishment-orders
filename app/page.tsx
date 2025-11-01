'use client'
import React, { useEffect, useState } from 'react'
import Papa from 'papaparse'

type WarehouseRow = { sku: string; product: string; unitsPerCarton: number }
type ScheduleRow = { store: string; monday?: string; tuesday?: string; wednesday?: string; thursday?: string; friday?: string; saturday?: string }
type PosRow = { store: string; product: string; qty: number; start: string; end: string }

const Card: React.FC<{title: string, children: React.ReactNode, extra?: React.ReactNode}> = ({ title, children, extra }) => (
  <div style={{ background:'#101737', border:'1px solid #263166', borderRadius:16, boxShadow:'0 6px 24px rgba(0,0,0,.25)', padding:16 }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
      <h3 style={{ margin:0, fontSize:18 }}>{title}</h3>
      {extra}
    </div>
    {children}
  </div>
)

const Pill = ({ children }:{children: React.ReactNode}) => (<span style={{background:'#1f2937', border:'1px solid #334155', padding:'4px 10px', borderRadius:999, fontSize:12}}>{children}</span>)

function useStateSnapshot() {
  const [warehouse, setWarehouse] = useState<WarehouseRow[]>([])
  const [schedule, setSchedule] = useState<ScheduleRow[]>([])
  const [pos, setPos] = useState<PosRow[]>([])
  const [held, setHeld] = useState<Record<string, number>>({})
  const refresh = async () => { const r = await fetch('/api/state'); const j = await r.json(); setWarehouse(j.warehouse||[]); setSchedule(j.schedule||[]); setPos(j.pos||[]); setHeld(j.held||{}) }
  useEffect(()=>{ refresh() }, [])
  const save = async (patch: any) => { await fetch('/api/state', { method:'POST', body: JSON.stringify(patch) }); await refresh() }
  return { warehouse, schedule, pos, held, save, refresh }
}

const parseDate = (s?: string) => s ? new Date(s) : undefined
const daysBetween = (a?: Date, b?: Date) => { if (!a || !b) return 0; const d = Math.round((b.getTime()-a.getTime())/(1000*60*60*24)); return Math.max(1, d+1) }
const keyHP = (store: string, product: string) => `${store}|${product}`

export default function Page() {
  const { warehouse, schedule, pos, held, save, refresh } = useStateSnapshot()
  const [tab, setTab] = useState<'dashboard'|'pos'|'repl'|'warehouse'|'schedule'>('dashboard')

  const latestEnd: Record<string,string> = {}; for (const r of pos) { if (!latestEnd[r.store] || new Date(r.end)>new Date(latestEnd[r.store])) latestEnd[r.store]=r.end }
  const pairs = Array.from(new Set(pos.map(r=>`${r.store}|${r.product}`)))
  const rows = pairs.map(k=>{
    const [store, product] = k.split('|'); const end = latestEnd[store]
    const subset = pos.filter(r=>r.store===store && r.product===product && r.end===end)
    const qtySold = subset.reduce((s,r)=>s+(Number(r.qty)||0), 0)
    const start = subset[0]?.start || end
    const days = daysBetween(parseDate(start), parseDate(end))
    const unitsPerCarton = warehouse.find(w=>w.product===product)?.unitsPerCarton || 1
    const heldUnits = held[keyHP(store,product)] || 0
    const cartonsIfSent = Math.ceil((heldUnits + qtySold) / unitsPerCarton)
    const rec = qtySold===0 ? 'No delivery' : (qtySold < unitsPerCarton ? 'Top up' : 'Full refill / consider storage')
    return { store, product, unitsPerCarton, qtySold, start, end, days, rate: qtySold/(days||1), heldUnits, send: true, cartonsIfSent, rec }
  })

  const uploadCSV = async (file: File) => {
    const fd = new FormData(); fd.append('file', file); await fetch('/api/upload', { method:'POST', body: fd }); await refresh()
  }
  const exportDelivery = () => {
    const lines = rows.filter(r=>r.send && r.cartonsIfSent>0).map(r=>({ Store:r.store, Product:r.product, Cartons:r.cartonsIfSent, UnitsPerCarton:r.unitsPerCarton, PeriodEnd:r.end }))
    const csv = Papa.unparse(lines); const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='delivery_breakdown.csv'; a.click(); URL.revokeObjectURL(url)
  }
  const applyDecisions = async () => {
    const decisions = rows.map(r=>({ store:r.store, product:r.product, send:r.send, qtySold:r.qtySold }))
    await fetch('/api/decide', { method:'POST', body: JSON.stringify({ decisions }) })
    await refresh(); alert('Decisions saved (held updated).')
  }

  return (
    <div>
      <h1 style={{ fontSize:28, marginBottom:6 }}>Bodero Store Replenishment Orders</h1>
      <p style={{ opacity:.8, marginTop:0 }}>Upload POS, review recommendations, choose Y/N, and export delivery breakdown.</p>

      <div style={{ display:'flex', gap:8, margin:'16px 0' }}>
        {['dashboard','pos','repl','warehouse','schedule'].map(t => (
          <button key={t} onClick={()=>setTab(t as any)} style={{ padding:'8px 12px', borderRadius:12, border:'1px solid #334155', background: tab===t?'#172554':'#0b1020', color:'white' }}>{t}</button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <button onClick={applyDecisions} style={{ padding:'8px 12px', borderRadius:10, background:'#2563eb', border:'1px solid #1e40af', color:'white' }}>Save Decisions</button>
          <button onClick={exportDelivery} style={{ padding:'8px 12px', borderRadius:10, background:'#0ea5e9', border:'1px solid #075985', color:'white' }}>Export Delivery CSV</button>
        </div>
      </div>

      {tab==='dashboard' && (
        <Card title="Delivery breakdown (products & cartons)">
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr><th>Store</th><th>Product</th><th style={{textAlign:'right'}}>Cartons</th></tr></thead>
            <tbody>{rows.filter(r=>r.send && r.cartonsIfSent>0).map((r,i)=>(<tr key={i}><td>{r.store}</td><td>{r.product}</td><td style={{textAlign:'right'}}>{r.cartonsIfSent}</td></tr>))}</tbody>
          </table>
        </Card>
      )}

      {tab==='pos' && (
        <Card title="POS Sync" extra={<Pill>CSV columns: Store, Description, Qty Sold, Period Start, Period End</Pill>}>
          <input type="file" accept=".csv" onChange={(e)=> e.target.files && uploadCSV(e.target.files[0])} />
          <div style={{ marginTop:12, maxHeight:320, overflow:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr><th>Store</th><th>Description</th><th style={{textAlign:'right'}}>Qty Sold</th><th>Start</th><th>End</th></tr></thead>
              <tbody>{(pos||[]).map((r,i)=>(<tr key={i}><td>{r.store}</td><td>{r.product}</td><td style={{textAlign:'right'}}>{r.qty}</td><td>{r.start}</td><td>{r.end}</td></tr>))}</tbody>
            </table>
          </div>
        </Card>
      )}

      {tab==='repl' && (
        <Card title="Replenishment">
          <div style={{ maxHeight:520, overflow:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr><th>Store</th><th>Product</th><th style={{textAlign:'right'}}>Units/Carton</th><th style={{textAlign:'right'}}>Qty Sold</th><th>Start</th><th>End</th><th style={{textAlign:'right'}}>Days</th><th style={{textAlign:'right'}}>Rate/day</th><th style={{textAlign:'right'}}>Held</th><th>Send?</th><th style={{textAlign:'right'}}>Cartons</th><th>Recommendation</th></tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i}>
                    <td>{r.store}</td>
                    <td>{r.product}</td>
                    <td style={{textAlign:'right'}}>{r.unitsPerCarton}</td>
                    <td style={{textAlign:'right'}}>{r.qtySold}</td>
                    <td>{r.start}</td><td>{r.end}</td>
                    <td style={{textAlign:'right'}}>{r.days}</td>
                    <td style={{textAlign:'right'}}>{(r.rate||0).toFixed(2)}</td>
                    <td style={{textAlign:'right'}}>{r.heldUnits}</td>
                    <td><input type="checkbox" defaultChecked onChange={(e)=>{ (rows as any)[i].send = e.target.checked }} /></td>
                    <td style={{textAlign:'right'}}>{r.cartonsIfSent}</td>
                    <td>{r.rec}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab==='warehouse' && (
        <Card title="Warehouse Master" extra={<button onClick={()=> save({ warehouse: [...warehouse, { sku:'', product:'', unitsPerCarton:1 }] })}>Add</button>}>
          <table style={{ width:'100%', borderCollapse:'collapse', marginTop:12 }}>
            <thead><tr><th>SKU</th><th>Product</th><th style={{textAlign:'right'}}>Units/Carton</th><th></th></tr></thead>
            <tbody>
              {warehouse.map((w,i)=>(
                <tr key={i}>
                  <td><input value={w.sku} onChange={(e)=>{ const next=[...warehouse]; next[i].sku=e.target.value; save({ warehouse: next }) }} /></td>
                  <td><input value={w.product} onChange={(e)=>{ const next=[...warehouse]; next[i].product=e.target.value; save({ warehouse: next }) }} /></td>
                  <td style={{textAlign:'right'}}><input value={String(w.unitsPerCarton)} onChange={(e)=>{ const next=[...warehouse]; next[i].unitsPerCarton=Number(e.target.value||0); save({ warehouse: next }) }} /></td>
                  <td style={{textAlign:'right'}}><button onClick={()=>{ const next=warehouse.slice(); next.splice(i,1); save({ warehouse: next }) }}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab==='schedule' && (
        <Card title="Delivery Schedule (Mon–Sat)" extra={<button onClick={()=> save({ schedule: [...schedule, { store:'' }] })}>Add Store</button>}>
          <table style={{ width:'100%', borderCollapse:'collapse', marginTop:12 }}>
            <thead><tr><th>Store</th><th>Monday</th><th>Tuesday</th><th>Wednesday</th><th>Thursday</th><th>Friday</th><th>Saturday</th><th></th></tr></thead>
            <tbody>
              {schedule.map((s,i)=>(
                <tr key={i}>
                  <td><input value={s.store} onChange={(e)=>{ const next=[...schedule]; (next[i] as any).store=e.target.value; save({ schedule: next }) }} /></td>
                  {['monday','tuesday','wednesday','thursday','friday','saturday'].map(d=>(
                    <td key={d}><input placeholder="YYYY-MM-DD[,YYYY-MM-DD]" value={(s as any)[d]||''} onChange={(e)=>{ const next=[...schedule]; (next[i] as any)[d]=e.target.value; save({ schedule: next }) }} /></td>
                  ))}
                  <td style={{textAlign:'right'}}><button onClick={()=>{ const next=schedule.slice(); next.splice(i,1); save({ schedule: next }) }}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
