import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      {/* Main content — sits next to the 240px sidebar on desktop */}
      <div className="flex-1 flex flex-col min-w-0 md:pb-0 pb-20">
        <Header />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
