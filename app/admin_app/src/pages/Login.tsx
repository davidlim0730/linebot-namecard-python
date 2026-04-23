export default function Login() {
  const handleLogin = () => {
    window.location.href = '/api/auth/line-login/authorize'
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-bg-base)] px-4">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-[color:var(--color-outline)] bg-white shadow-[var(--shadow-popover)]">
        <div className="h-1 bg-gradient-to-r from-[color:var(--color-primary)] to-sky-500" />
        <div className="p-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-primary-dark)] text-2xl font-extrabold text-white shadow-lg shadow-emerald-500/20">
          M
        </div>
        <h1 className="display-font text-3xl font-bold text-[color:var(--color-text-primary)]">Mingpian CRM</h1>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-text-secondary)]/70">業務員的隨身 AI 助理，讓案件、聯絡人與待辦在同一個工作檯完成整理。</p>
        <button
          onClick={handleLogin}
          className="mt-8 w-full rounded-2xl bg-[color:var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-dark)]"
        >
          以 LINE 登入
        </button>
        </div>
      </div>
    </div>
  )
}
