import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { api, AuthError, clearToken, getToken, type Client, type Dashboard, type DueItem, type Loan } from './api'
import { enablePush, pushState } from './push'

const cop = (n: number) => '$' + n.toLocaleString('es-CO')
const fmtDate = (iso: string) =>
  new Date(iso.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
const todayStr = () => new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10)

type Tab = 'hoy' | 'prestamos' | 'clientes'

export default function App() {
  const [authed, setAuthed] = useState(!!getToken())
  if (!authed) return <Login onDone={() => setAuthed(true)} />
  return (
    <Shell
      onLogout={() => {
        clearToken()
        setAuthed(false)
      }}
    />
  )
}

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      await api.login(pw)
      onDone()
    } catch (x) {
      setErr((x as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-4 size-16 rounded-full border-2 border-gold grid place-items-center text-gold text-2xl font-bold">
            $
          </div>
          <h1 className="text-2xl font-semibold">TrackerLoans</h1>
          <p className="text-mute text-sm mt-1">Control de préstamos y cuotas</p>
        </div>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Clave"
          className="w-full rounded-xl bg-card border border-line px-4 py-3 outline-none focus:border-gold"
        />
        {err && <p className="text-bad text-sm text-center">{err}</p>}
        <button disabled={busy || !pw} className="w-full rounded-xl bg-gold text-ink font-semibold py-3 disabled:opacity-50">
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('hoy')
  const [dash, setDash] = useState<Dashboard | null>(null)
  const [loans, setLoans] = useState<Loan[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [sheet, setSheet] = useState<null | 'loan' | 'client'>(null)
  const [error, setError] = useState('')
  const [push, setPush] = useState<Awaited<ReturnType<typeof pushState>> | null>(null)

  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof AuthError) onLogout()
      else setError((e as Error).message)
    },
    [onLogout],
  )

  const reload = useCallback(async () => {
    try {
      const [d, l, c] = await Promise.all([api.dashboard(), api.loans(), api.clients()])
      setDash(d)
      setLoans(l)
      setClients(c)
      setError('')
    } catch (e) {
      fail(e)
    }
  }, [fail])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
    pushState().then(setPush)
  }, [reload])

  async function pay(id: string, undo = false) {
    try {
      await (undo ? api.unpay(id) : api.pay(id))
      await reload()
    } catch (e) {
      fail(e)
    }
  }

  async function activatePush() {
    try {
      await enablePush()
      await api.pushTest()
      setPush('on')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const alertCount = dash ? dash.overdue.length + dash.today.length : 0

  return (
    <div className="mx-auto max-w-lg min-h-screen pb-28">
      <header className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <p className="text-mute text-xs uppercase tracking-widest">TrackerLoans</p>
          <h1 className="text-xl font-semibold">
            {tab === 'hoy' ? 'Cobros' : tab === 'prestamos' ? 'Préstamos' : 'Clientes'}
          </h1>
        </div>
        <button onClick={onLogout} className="text-mute text-sm px-3 py-2">
          Salir
        </button>
      </header>

      {push === 'off' && (
        <button
          onClick={activatePush}
          className="mx-5 mb-3 w-[calc(100%-2.5rem)] rounded-xl border border-gold/40 bg-gold/10 text-gold-soft text-sm py-3"
        >
          🔔 Activar avisos de cobro en este celular
        </button>
      )}
      {push === 'denied' && (
        <p className="mx-5 mb-3 text-xs text-mute">Las notificaciones están bloqueadas en este navegador.</p>
      )}
      {error && <p className="mx-5 mb-3 text-bad text-sm">{error}</p>}

      <main className="px-5 space-y-6">
        {tab === 'hoy' && dash && <TodayView dash={dash} onPay={pay} />}
        {tab === 'prestamos' && <LoansView loans={loans} onPay={pay} onDelete={async (id) => {
          if (!confirm('¿Eliminar este préstamo y todas sus cuotas?')) return
          try { await api.deleteLoan(id); await reload() } catch (e) { fail(e) }
        }} />}
        {tab === 'clientes' && <ClientsView clients={clients} loans={loans} onDelete={async (id) => {
          if (!confirm('¿Eliminar cliente y sus préstamos?')) return
          try { await api.deleteClient(id); await reload() } catch (e) { fail(e) }
        }} />}
      </main>

      <button
        onClick={() => setSheet(tab === 'clientes' ? 'client' : 'loan')}
        className="fixed right-5 bottom-24 size-14 rounded-full bg-gold text-ink text-3xl leading-none shadow-lg shadow-black/40"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Nuevo"
      >
        +
      </button>

      <nav
        className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur border-t border-line"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto max-w-lg grid grid-cols-3">
          {([
            ['hoy', 'Cobros', alertCount],
            ['prestamos', 'Préstamos', 0],
            ['clientes', 'Clientes', 0],
          ] as const).map(([k, label, badge]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`py-4 text-sm font-medium relative ${tab === k ? 'text-gold' : 'text-mute'}`}
            >
              {label}
              {badge > 0 && (
                <span className="absolute top-2.5 ml-1 text-[10px] bg-bad text-ink rounded-full px-1.5 font-bold">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {sheet === 'loan' && (
        <Sheet title="Nuevo préstamo" onClose={() => setSheet(null)}>
          <LoanForm
            clients={clients}
            onDone={async () => {
              setSheet(null)
              setTab('hoy')
              await reload()
            }}
            onError={fail}
          />
        </Sheet>
      )}
      {sheet === 'client' && (
        <Sheet title="Nuevo cliente" onClose={() => setSheet(null)}>
          <ClientForm
            onDone={async () => {
              setSheet(null)
              await reload()
            }}
            onError={fail}
          />
        </Sheet>
      )}
    </div>
  )
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg mx-auto bg-card rounded-t-3xl border-t border-line p-5 max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-mute text-2xl leading-none px-2">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputCls = 'w-full rounded-xl bg-ink border border-line px-4 py-3 outline-none focus:border-gold'
const labelCls = 'block text-xs text-mute mb-1.5'

function ClientForm({ onDone, onError }: { onDone: () => void; onError: (e: unknown) => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      await api.addClient({ name: name.trim(), phone: phone.trim() || undefined })
      onDone()
    } catch (x) {
      onError(x)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls}>Nombre</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div>
        <label className={labelCls}>Teléfono (opcional)</label>
        <input className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <button disabled={!name.trim()} className="w-full rounded-xl bg-gold text-ink font-semibold py-3 disabled:opacity-50">
        Guardar
      </button>
    </form>
  )
}

function LoanForm({
  clients,
  onDone,
  onError,
}: {
  clients: Client[]
  onDone: () => void
  onError: (e: unknown) => void
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [principal, setPrincipal] = useState('500000')
  const [rate, setRate] = useState('15')
  const [n, setN] = useState('5')
  const [interval, setIntervalDays] = useState('7')
  const [start, setStart] = useState(todayStr())

  const p = Number(principal) || 0
  const total = Math.round(p * (1 + (Number(rate) || 0) / 100))
  const nn = Math.max(1, Number(n) || 1)
  const each = Math.floor(total / nn)

  if (!clients.length)
    return <p className="text-mute text-sm">Primero crea un cliente en la pestaña “Clientes”.</p>

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      await api.addLoan({
        clientId,
        principal: p,
        interestRate: Number(rate),
        installments: nn,
        intervalDays: Number(interval) || 7,
        startDate: start,
      })
      onDone()
    } catch (x) {
      onError(x)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls}>Cliente</label>
        <select className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Monto prestado (COP)</label>
        <input className={inputCls} inputMode="numeric" value={principal} onChange={(e) => setPrincipal(e.target.value.replace(/\D/g, ''))} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Interés %</label>
          <input className={inputCls} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Cuotas</label>
          <input className={inputCls} inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div>
          <label className={labelCls}>Cada (días)</label>
          <input className={inputCls} inputMode="numeric" value={interval} onChange={(e) => setIntervalDays(e.target.value.replace(/\D/g, ''))} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Fecha del préstamo</label>
        <input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
      </div>
      <div className="rounded-xl bg-ink border border-line p-4 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-mute">Total a recibir</span><span className="font-semibold text-gold-soft">{cop(total)}</span></div>
        <div className="flex justify-between"><span className="text-mute">{nn} cuotas de</span><span className="font-semibold">{cop(each)}</span></div>
        <div className="flex justify-between"><span className="text-mute">Ganancia</span><span className="font-semibold text-ok">{cop(total - p)}</span></div>
      </div>
      <button disabled={!p || !clientId} className="w-full rounded-xl bg-gold text-ink font-semibold py-3 disabled:opacity-50">
        Crear préstamo
      </button>
    </form>
  )
}

function DueRow({ i, tone, onPay }: { i: DueItem; tone: 'bad' | 'gold' | 'mute'; onPay: (id: string) => void }) {
  const color = tone === 'bad' ? 'text-bad' : tone === 'gold' ? 'text-gold-soft' : 'text-mute'
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card border border-line p-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{i.clientName}</p>
        <p className={`text-xs mt-0.5 ${color}`}>
          Cuota {i.number}/{i.installments} · {fmtDate(i.dueDate)}
        </p>
      </div>
      <p className="font-semibold tabular-nums">{cop(i.amount)}</p>
      <button
        onClick={() => onPay(i.id)}
        className="rounded-xl bg-ok/15 text-ok font-semibold text-sm px-4 py-2.5 active:scale-95"
      >
        Pagó
      </button>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-card border border-line p-4">
      <p className="text-xs text-mute">{label}</p>
      <p className={`text-lg font-semibold mt-1 tabular-nums ${accent ? 'text-gold-soft' : ''}`}>{cop(value)}</p>
    </div>
  )
}

function TodayView({ dash, onPay }: { dash: Dashboard; onPay: (id: string) => void }) {
  const empty = !dash.overdue.length && !dash.today.length
  return (
    <>
      <section className="grid grid-cols-2 gap-3">
        <Stat label="Por cobrar" value={dash.totals.outstanding} accent />
        <Stat label="Cobrado" value={dash.totals.collected} />
        <Stat label="Prestado" value={dash.totals.lent} />
        <Stat label="Ganancia esperada" value={dash.totals.expectedInterest} />
      </section>

      {empty && (
        <p className="text-center text-mute text-sm py-6">Nada vencido ni para hoy. ✨</p>
      )}
      {dash.overdue.length > 0 && (
        <Group title={`Vencidas (${dash.overdue.length})`} color="text-bad">
          {dash.overdue.map((i) => <DueRow key={i.id} i={i} tone="bad" onPay={onPay} />)}
        </Group>
      )}
      {dash.today.length > 0 && (
        <Group title={`Hoy (${dash.today.length})`} color="text-gold-soft">
          {dash.today.map((i) => <DueRow key={i.id} i={i} tone="gold" onPay={onPay} />)}
        </Group>
      )}
      {dash.upcoming.length > 0 && (
        <Group title="Próximas" color="text-mute">
          {dash.upcoming.map((i) => <DueRow key={i.id} i={i} tone="mute" onPay={onPay} />)}
        </Group>
      )}
    </>
  )
}

function Group({ title, color, children }: { title: string; color: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className={`text-xs uppercase tracking-widest font-semibold ${color}`}>{title}</h2>
      {children}
    </section>
  )
}

function LoansView({
  loans,
  onPay,
  onDelete,
}: {
  loans: Loan[]
  onPay: (id: string, undo?: boolean) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  if (!loans.length) return <p className="text-center text-mute text-sm py-10">Aún no hay préstamos. Toca + para crear uno.</p>
  return (
    <div className="space-y-3">
      {loans.map((l) => {
        const paid = l.items.filter((i) => i.paidAt).length
        const done = paid === l.items.length
        const isOpen = open === l.id
        return (
          <div key={l.id} className="rounded-2xl bg-card border border-line overflow-hidden">
            <button onClick={() => setOpen(isOpen ? null : l.id)} className="w-full text-left p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{l.client.name}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${done ? 'bg-ok/15 text-ok' : 'bg-gold/15 text-gold-soft'}`}>
                  {done ? 'Finalizado' : `${paid}/${l.items.length} cuotas`}
                </span>
              </div>
              <p className="text-xs text-mute mt-1">
                {cop(l.principal)} → {cop(l.total)} · {l.interestRate}%
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-ink overflow-hidden">
                <div className="h-full bg-gold" style={{ width: `${(paid / l.items.length) * 100}%` }} />
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-line p-4 space-y-2">
                {l.items.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 text-sm">
                    <span className="w-6 text-mute">{i.number}</span>
                    <span className="flex-1">{fmtDate(i.dueDate)}</span>
                    <span className="tabular-nums">{cop(i.amount)}</span>
                    {i.paidAt ? (
                      <button onClick={() => onPay(i.id, true)} className="text-ok text-xs px-3 py-1.5 rounded-lg bg-ok/10">
                        ✓ Pagada
                      </button>
                    ) : (
                      <button onClick={() => onPay(i.id)} className="text-gold-soft text-xs px-3 py-1.5 rounded-lg bg-gold/10">
                        Marcar
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => onDelete(l.id)} className="text-bad text-xs pt-2">
                  Eliminar préstamo
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ClientsView({ clients, loans, onDelete }: { clients: Client[]; loans: Loan[]; onDelete: (id: string) => void }) {
  if (!clients.length) return <p className="text-center text-mute text-sm py-10">Toca + para agregar tu primer cliente.</p>
  return (
    <div className="space-y-2.5">
      {clients.map((c) => {
        const mine = loans.filter((l) => l.client.id === c.id)
        const owed = mine.flatMap((l) => l.items).filter((i) => !i.paidAt).reduce((s, i) => s + i.amount, 0)
        return (
          <div key={c.id} className="rounded-2xl bg-card border border-line p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{c.name}</p>
              <p className="text-xs text-mute mt-0.5">
                {c.phone ?? 'Sin teléfono'} · {mine.length} préstamo{mine.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-mute">Debe</p>
              <p className={`font-semibold tabular-nums ${owed ? 'text-gold-soft' : 'text-ok'}`}>{cop(owed)}</p>
            </div>
            <button onClick={() => onDelete(c.id)} className="text-mute text-lg px-1" aria-label="Eliminar">×</button>
          </div>
        )
      })}
    </div>
  )
}
