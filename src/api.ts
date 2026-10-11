const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export interface Client {
  id: string
  name: string
  phone: string | null
  notes: string | null
}
export interface Installment {
  id: string
  number: number
  amount: number
  dueDate: string
  paidAt: string | null
  paidAmt: number | null
}
export interface Loan {
  id: string
  principal: number
  interestRate: number
  total: number
  installments: number
  intervalDays: number
  startDate: string
  number: number
  client: Client
  items: Installment[]
}
export interface DueItem {
  id: string
  number: number
  amount: number
  dueDate: string
  loanId: string
  loanNo: number
  principal: number
  loanStart: string
  installments: number
  clientName: string
  phone: string | null
}
export interface Dashboard {
  overdue: DueItem[]
  today: DueItem[]
  upcoming: DueItem[]
  totals: { lent: number; collected: number; outstanding: number; expectedInterest: number }
}

const TOKEN_KEY = 'tl_token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export class AuthError extends Error {}

async function req<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = getToken()
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401 && path !== '/auth/login') {
    clearToken()
    throw new AuthError('Sesión expirada')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Error de red')
  return data as T
}

export const api = {
  async login(password: string) {
    const r = await req<{ token: string }>('/auth/login', 'POST', { password })
    localStorage.setItem(TOKEN_KEY, r.token)
  },
  dashboard: () => req<Dashboard>('/dashboard'),
  clients: () => req<Client[]>('/clients'),
  addClient: (c: { name: string; phone?: string }) => req<Client>('/clients', 'POST', c),
  deleteClient: (id: string) => req<{ ok: true }>(`/clients/${id}`, 'DELETE'),
  loans: () => req<Loan[]>('/loans'),
  addLoan: (l: {
    clientId: string
    principal: number
    interestRate: number
    installments: number
    intervalDays: number
    startDate: string
  }) => req<Loan>('/loans', 'POST', l),
  deleteLoan: (id: string) => req<{ ok: true }>(`/loans/${id}`, 'DELETE'),
  pay: (id: string, o: { amount?: number; paidAt?: string } = {}) =>
    req<Installment>(`/installments/${id}/pay`, 'POST', o),
  unpay: (id: string) => req<Installment>(`/installments/${id}/unpay`, 'POST', {}),
  pushKey: () => req<{ key: string | null; enabled: boolean }>('/push/key'),
  pushSubscribe: (sub: PushSubscriptionJSON) => req<{ ok: true }>('/push/subscribe', 'POST', sub),
  pushTest: () => req<{ devices: number }>('/push/test', 'POST', {}),
}
