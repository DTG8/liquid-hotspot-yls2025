import React, { useState, useEffect } from 'react'
import axios from 'axios'

// Configure axios base URL
axios.defaults.baseURL = 'http://localhost:3001'

interface User {
  id: number
  fullName: string
  email: string
  companyName?: string
  phoneNumber: string
  createdAt?: string
}

interface Usage {
  sessionId: string
  startTime: string
  endTime: string
  bytesIn: number
  bytesOut: number
  duration: number
}

interface Stats {
  totalUsers: number
  activeSessions: number
  systemStatus: string
}

function App() {
                const [currentPage, setCurrentPage] = useState('portal') // portal, dashboard, admin
              
              // Check for admin access via URL parameter
              useEffect(() => {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('admin') === 'true') {
                  setCurrentPage('admin');
                }
              }, []);
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    companyName: '',
    fullName: '',
    email: '',
    phoneNumber: ''
  })
  const [adminData, setAdminData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [adminToken, setAdminToken] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, activeSessions: 0, systemStatus: 'Online' })
  const [usage, setUsage] = useState<Usage[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const response = await axios.post(endpoint, formData)
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
        setUser(response.data.user)
        setCurrentPage('dashboard')
        setMessage(isLogin ? 'Login successful!' : 'Registration successful!')
      }
    } catch (error) {
      setMessage('Error occurred. Please try again.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await axios.post('/api/admin/login', adminData)
      
      if (response.data.token) {
        setAdminToken(response.data.token)
        setCurrentPage('admin')
        setMessage('Admin login successful!')
        fetchUsers(response.data.token)
        fetchStats(response.data.token)
      }
    } catch (error) {
      setMessage('Invalid admin credentials.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async (token: string) => {
    try {
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(response.data.users)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

                const fetchStats = async (token: string) => {
                try {
                  const response = await axios.get('/api/admin/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                  })
                  setStats(response.data)
                } catch (error) {
                  console.error('Failed to fetch stats:', error)
                }
              }

              const handleExport = async (format: string) => {
                try {
                  const token = localStorage.getItem('token')
                  if (!token) {
                    setMessage('No admin token found')
                    return
                  }

                  const response = await axios.get(`/api/admin/export/${format}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob'
                  })

                  // Create download link
                  const url = window.URL.createObjectURL(new Blob([response.data]))
                  const link = document.createElement('a')
                  link.href = url
                  
                  // Set filename based on format
                  const filename = `YLS2025_users_${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'txt' : format}`
                  link.setAttribute('download', filename)
                  
                  document.body.appendChild(link)
                  link.click()
                  link.remove()
                  window.URL.revokeObjectURL(url)
                  
                  setMessage(`Export successful! File: ${filename}`)
                } catch (error) {
                  console.error('Export failed:', error)
                  setMessage('Export failed. Please try again.')
                }
              }

  const fetchUsage = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/users/usage', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsage(response.data.usage)
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setCurrentPage('portal')
    setMessage('Logged out successfully')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleAdminInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdminData({
      ...adminData,
      [e.target.name]: e.target.value
    })
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && currentPage === 'dashboard') {
      fetchUsage()
    }
  }, [currentPage])

  // Captive Portal Page
  if (currentPage === 'portal') {
    return (
      <div className="form-container">
        <div className="form-card">
          <div className="logo">L</div>
          <h2 className="form-title">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="form-subtitle">2025 Youth Leadership Summit #YLS2025</p>
          
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div className="input-group">
                  <label className="input-label">Company Name</label>
                  <input
                    name="companyName"
                    type="text"
                    required
                    className="input-field"
                    placeholder="Enter your company name"
                    value={formData.companyName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input
                    name="fullName"
                    type="text"
                    required
                    className="input-field"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}
            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                name="email"
                type="email"
                required
                className="input-field"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <input
                name="phoneNumber"
                type="tel"
                required
                className="input-field"
                placeholder="Enter your phone number"
                value={formData.phoneNumber}
                onChange={handleInputChange}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-full"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Register')}
            </button>

            {message && (
              <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
                {message}
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="link"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign in'}
              </button>
            </div>

            
          </form>
        </div>
      </div>
    )
  }

  // User Dashboard Page
  if (currentPage === 'dashboard') {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Welcome, {user?.fullName}!</h1>
            <p className="dashboard-subtitle">2025 Youth Leadership Summit #YLS2025</p>
          </div>
                                <button onClick={handleLogout} className="btn btn-secondary">
                        Logout
                      </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3 className="stat-title">Total Sessions</h3>
            <p className="stat-value">{usage.length}</p>
          </div>
          <div className="stat-card">
            <h3 className="stat-title">Last Session</h3>
            <p className="stat-subtitle">
              {usage[0]?.startTime ? new Date(usage[0].startTime).toLocaleDateString() : 'No sessions'}
            </p>
          </div>
          <div className="stat-card">
            <h3 className="stat-title">Status</h3>
            <p className="stat-value" style={{ color: '#10b981' }}>Connected</p>
          </div>
        </div>

        <div className="table-container">
          <h2 className="table-title">Usage History</h2>
          {usage.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Start Time</th>
                  <th>Duration</th>
                  <th>Data Used</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((session: Usage, index: number) => (
                  <tr key={index}>
                    <td>{session.sessionId}</td>
                    <td>{new Date(session.startTime).toLocaleString()}</td>
                    <td>{Math.round(session.duration / 60)} minutes</td>
                    <td>
                      {Math.round((session.bytesIn + session.bytesOut) / 1024 / 1024)} MB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#a0aec0' }}>No usage data available</p>
          )}
        </div>
      </div>
    )
  }

  // Admin Panel Page
  if (currentPage === 'admin') {
    return (
      <div className="dashboard">
                            <div className="dashboard-header">
                      <div>
                        <h1 className="dashboard-title">Admin Panel</h1>
                        <p className="dashboard-subtitle">2025 Youth Leadership Summit #YLS2025</p>
                        <p style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>
                          Access: Add ?admin=true to URL
                        </p>
                      </div>
                      <button onClick={() => setCurrentPage('portal')} className="btn btn-secondary">
                        Back
                      </button>
                    </div>

        {!adminToken ? (
          <div className="form-container">
            <div className="form-card">
              <form onSubmit={handleAdminLogin}>
                <div className="input-group">
                  <label className="input-label">Admin Username</label>
                  <input
                    name="username"
                    type="text"
                    required
                    className="input-field"
                    placeholder="Admin Username"
                    value={adminData.username}
                    onChange={handleAdminInputChange}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Admin Password</label>
                  <input
                    name="password"
                    type="password"
                    required
                    className="input-field"
                    placeholder="Admin Password"
                    value={adminData.password}
                    onChange={handleAdminInputChange}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-full"
                >
                  {loading ? 'Logging in...' : 'Admin Login'}
                </button>
                {message && (
                  <div className={`message ${message.includes('Invalid') ? 'error' : 'success'}`}>
                    {message}
                  </div>
                )}
              </form>
            </div>
          </div>
        ) : (
          <div>
            <div className="stats-grid">
              <div className="stat-card">
                <h3 className="stat-title">Total Users</h3>
                <p className="stat-value">{stats.totalUsers || 0}</p>
              </div>
              <div className="stat-card">
                <h3 className="stat-title">Active Sessions</h3>
                <p className="stat-value">{stats.activeSessions || 0}</p>
              </div>
              <div className="stat-card">
                <h3 className="stat-title">System Status</h3>
                <p className="stat-value" style={{ color: '#10b981' }}>{stats.systemStatus || 'Online'}</p>
              </div>
            </div>

            {message && (
              <div className={`message ${message.includes('failed') ? 'error' : 'success'}`} style={{ margin: '20px' }}>
                {message}
              </div>
            )}

            <div className="table-container">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 className="table-title">User Management</h2>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button 
                                onClick={() => handleExport('csv')}
                                className="btn btn-primary"
                                style={{ width: 'auto', padding: '8px 16px', fontSize: '14px' }}
                              >
                                Export CSV
                              </button>
                              <button 
                                onClick={() => handleExport('json')}
                                className="btn btn-primary"
                                style={{ width: 'auto', padding: '8px 16px', fontSize: '14px' }}
                              >
                                Export JSON
                              </button>
                              <button 
                                onClick={() => handleExport('pdf')}
                                className="btn btn-primary"
                                style={{ width: 'auto', padding: '8px 16px', fontSize: '14px' }}
                              >
                                Export Text
                              </button>
                            </div>
                          </div>
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Company</th>
                                <th>Phone</th>
                                <th>Registered</th>
                              </tr>
                            </thead>
                            <tbody>
                              {users.map((user: User) => (
                                <tr key={user.id}>
                                  <td>{user.fullName}</td>
                                  <td>{user.email}</td>
                                  <td>{user.companyName}</td>
                                  <td>{user.phoneNumber}</td>
                                  <td>{new Date(user.createdAt || '').toLocaleDateString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
          </div>
        )}
      </div>
    )
  }

  return null
}

export default App 