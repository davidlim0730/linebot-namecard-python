export default function Login() {
  const handleLogin = () => {
    window.location.href = '/api/auth/line-login/authorize'
  }
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-10 w-80 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">CRM Admin</h1>
        <p className="text-sm text-gray-500 mb-8">業務團隊管理後台</p>
        <button
          onClick={handleLogin}
          className="w-full bg-[#06C755] hover:bg-[#05a847] text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          以 LINE 登入
        </button>
      </div>
    </div>
  )
}
