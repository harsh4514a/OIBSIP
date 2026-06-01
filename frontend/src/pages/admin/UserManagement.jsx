import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, UserX, User } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { getAllUsers, deleteUser } from '../../api/admin'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data } = await getAllUsers({ search, page, limit: 12 })
      setUsers(data.data?.users || [])
      setTotalPages(data.data?.pagination?.pages || 1)
    } catch { toast.error('Failed') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [search, page])

  const handleDelete = async (userId) => {
    if (!confirm('Remove this user?')) return
    try {
      await deleteUser(userId)
      setUsers(prev => prev.filter(u => u._id !== userId))
      toast.success('User removed')
    } catch { toast.error('Failed') }
  }

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage registered users</p>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left text-muted-foreground">
                {['User', 'Email', 'Phone', 'Role', 'Joined', 'Verified', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? Array(5).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-8 bg-muted rounded animate-pulse" /></td></tr>
              )) : users.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No users found</td></tr>
              ) : users.map(user => (
                <tr key={user._id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="font-medium text-foreground">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{user.email}</td>
                  <td className="px-5 py-4 text-muted-foreground">{user.phone || '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground text-xs">{formatDate(user.createdAt)}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${user.isEmailVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.isEmailVerified ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {user.role !== 'admin' && (
                      <button onClick={() => handleDelete(user._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-border flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40">Previous</button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
